import { create } from 'zustand';
import type { BoundingBox, GeoPoint, ImageScene, SceneLayer } from '@/types';
import type { ProviderSearchOutcome } from '@/services';
import { providerRegistry, sceneSearchService } from '@/services';
import { bboxAroundPoint, bboxCovers, bboxSpan, clampBboxSpan, expandBbox } from '@/utils/bbox';
import {
  DEFAULT_LOCATION,
  DEFAULT_MAX_CLOUD_COVER,
  MAX_SEARCH_BBOX_SPAN,
} from '@/config/app.config';

/** Fallback bbox padding (degrees) when no viewport is known (search / first load). */
const SEARCH_BBOX_DELTA = 0.05;

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';
export type SidePanel = 'scenes' | 'metadata' | null;

interface ExplorerState {
  locationName: string;
  center: GeoPoint;
  zoom: number;
  /** Monotonic counter that tells the map to fly to `center`. */
  flyRequestId: number;

  searchStatus: SearchStatus;
  scenes: ImageScene[];
  outcomes: ProviderSearchOutcome[];

  selectedScene: ImageScene | null;
  sceneLayer: SceneLayer | null;
  sceneLayerLoading: boolean;

  overlayOpacity: number;
  compareMode: boolean;
  activePanel: SidePanel;

  /** Scene shown on the RIGHT side of compare; null = current-day basemap. */
  compareRightScene: ImageScene | null;
  compareRightLayer: SceneLayer | null;

  goTo: (name: string, center: GeoPoint, zoom?: number) => void;
  searchScenesAt: (center: GeoPoint, bbox?: BoundingBox) => Promise<void>;
  /** Map settled somewhere — refresh the scene list if the view changed enough. */
  mapMoved: (center: GeoPoint, viewport: BoundingBox) => void;
  selectScene: (scene: ImageScene | null) => Promise<void>;
  setOverlayOpacity: (opacity: number) => void;
  setCompareMode: (enabled: boolean) => void;
  setActivePanel: (panel: SidePanel) => void;
  setCompareRight: (scene: ImageScene | null) => Promise<void>;
  /** One-tap: best oldest sharp scene on the left vs today's imagery. */
  quickCompare: () => Promise<void>;
}

let searchAbort: AbortController | null = null;
/** Area covered by the last executed search — pan-follow skips views it already answers. */
let searchedBbox: BoundingBox | null = null;
let panSearchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Does the last search still answer this viewport? Yes while the viewport
 * stays inside the searched area (with some slack) at a comparable scale.
 * Zooming far in re-searches too: a wide-area search truncates at the
 * provider limit, so a city view deserves its own, denser result set.
 */
function searchCovers(searched: BoundingBox, viewport: BoundingBox): boolean {
  const scaleRatio = bboxSpan(viewport) / bboxSpan(searched);
  return bboxCovers(expandBbox(searched, 0.3), viewport) && scaleRatio > 1 / 3 && scaleRatio < 3;
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  locationName: DEFAULT_LOCATION.name,
  center: DEFAULT_LOCATION.center,
  zoom: DEFAULT_LOCATION.zoom,
  flyRequestId: 0,

  searchStatus: 'idle',
  scenes: [],
  outcomes: [],

  selectedScene: null,
  sceneLayer: null,
  sceneLayerLoading: false,

  overlayOpacity: 1,
  compareMode: false,
  activePanel: null,
  compareRightScene: null,
  compareRightLayer: null,

  goTo: (name, center, zoom) => {
    set((state) => ({
      locationName: name,
      center,
      zoom: zoom ?? state.zoom,
      flyRequestId: state.flyRequestId + 1,
    }));
    void get().searchScenesAt(center);
  },

  mapMoved: (center, viewport) => {
    if (searchedBbox && searchCovers(searchedBbox, viewport)) return;
    // Small settle delay: panning across the country in several flicks
    // should trigger one search at the destination, not one per flick.
    if (panSearchTimer) clearTimeout(panSearchTimer);
    panSearchTimer = setTimeout(() => {
      set({ center, locationName: 'Map view' });
      void get().searchScenesAt(center, clampBboxSpan(viewport, MAX_SEARCH_BBOX_SPAN));
    }, 600);
  },

  searchScenesAt: async (center, bbox) => {
    searchAbort?.abort();
    const abort = new AbortController();
    searchAbort = abort;
    const searchBbox = bbox ?? bboxAroundPoint(center, SEARCH_BBOX_DELTA);
    searchedBbox = searchBbox;
    set({ searchStatus: 'loading' });
    try {
      const result = await sceneSearchService.search(
        {
          spatial: { kind: 'bbox', bbox: searchBbox },
          maxCloudCover: DEFAULT_MAX_CLOUD_COVER,
        },
        abort.signal,
      );
      if (abort.signal.aborted) return;
      set({ searchStatus: 'done', scenes: result.scenes, outcomes: result.outcomes });
    } catch (error) {
      if (abort.signal.aborted) return;
      console.error('Scene search failed', error);
      set({ searchStatus: 'error' });
    }
  },

  selectScene: async (scene) => {
    if (!scene) {
      set({ selectedScene: null, sceneLayer: null, sceneLayerLoading: false });
      return;
    }
    set({
      selectedScene: scene,
      sceneLayer: null,
      sceneLayerLoading: true,
      activePanel: 'metadata',
    });
    try {
      const layer = await providerRegistry.get(scene.provider).load(scene);
      // Ignore stale loads if the user has moved on to another scene.
      if (get().selectedScene?.id === scene.id) {
        set({ sceneLayer: layer, sceneLayerLoading: false });
        // On phones the bottom sheet covers the map — once the image is
        // draped, close the sheet so the result is immediately visible.
        if (layer && isNarrowViewport()) set({ activePanel: null });
      }
    } catch (error) {
      console.error(`Failed to load scene ${scene.id}`, error);
      if (get().selectedScene?.id === scene.id) set({ sceneLayerLoading: false });
    }
  },

  setOverlayOpacity: (opacity) => set({ overlayOpacity: clamp01(opacity) }),
  setCompareMode: (enabled) => set({ compareMode: enabled }),
  setActivePanel: (panel) => set({ activePanel: panel }),

  quickCompare: async () => {
    const { scenes, selectScene, setCompareRight } = get();
    // Prefer the oldest scene that renders as a sharp tile pyramid; fall
    // back to the oldest scene with any displayable preview.
    const displayable = scenes.filter(
      (scene) => scene.metadata['displayable'] === true || scene.previewUrl,
    );
    if (displayable.length === 0) return;
    // `tiled` (our own full-resolution pyramid), NOT `displayable`: Wayback
    // and Maxar mark every scene displayable, so filtering on that put a 2014
    // basemap snapshot on the "then" side and made the fallback unreachable.
    const sharp = displayable.filter((scene) => scene.metadata['tiled'] === true);
    const left = (sharp.length > 0 ? sharp : displayable)[0] ?? null;
    await setCompareRight(null);
    set({ compareMode: true, activePanel: null });
    await selectScene(left);
  },

  setCompareRight: async (scene) => {
    if (!scene) {
      set({ compareRightScene: null, compareRightLayer: null });
      return;
    }
    set({ compareRightScene: scene, compareRightLayer: null, compareMode: true });
    try {
      const layer = await providerRegistry.get(scene.provider).load(scene);
      if (get().compareRightScene?.id === scene.id) {
        set({ compareRightLayer: layer });
        if (layer && isNarrowViewport()) set({ activePanel: null });
      }
    } catch (error) {
      console.error(`Failed to load compare scene ${scene.id}`, error);
    }
  },
}));

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Matches Tailwind's `sm` breakpoint — below it panels render as a bottom sheet. */
function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}
