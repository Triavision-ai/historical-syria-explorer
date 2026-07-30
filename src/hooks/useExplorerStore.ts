import { create } from 'zustand';
import type { GeoPoint, ImageScene, SceneLayer } from '@/types';
import type { ProviderSearchOutcome } from '@/services';
import { providerRegistry, sceneSearchService } from '@/services';
import { bboxAroundPoint } from '@/utils/bbox';
import { yearDistance } from '@/utils/date';
import { cloudCoverOf } from '@/utils/scene';
import {
  DEFAULT_LOCATION,
  DEFAULT_MAX_CLOUD_COVER,
  TIMELINE_MATCH_TOLERANCE_YEARS,
} from '@/config/app.config';

/** Degrees of padding around a point when searching scenes for a location. */
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

  activeYear: number | null;
  overlayOpacity: number;
  compareMode: boolean;
  activePanel: SidePanel;

  /** Scene shown on the RIGHT side of compare; null = current-day basemap. */
  compareRightScene: ImageScene | null;
  compareRightLayer: SceneLayer | null;

  goTo: (name: string, center: GeoPoint, zoom?: number) => void;
  searchScenesAt: (center: GeoPoint) => Promise<void>;
  /** Map settled at a new spot — refresh the scene list if it moved enough. */
  mapMoved: (center: GeoPoint) => void;
  selectScene: (scene: ImageScene | null) => Promise<void>;
  selectYear: (year: number) => Promise<void>;
  setOverlayOpacity: (opacity: number) => void;
  setCompareMode: (enabled: boolean) => void;
  setActivePanel: (panel: SidePanel) => void;
  setCompareRight: (scene: ImageScene | null) => Promise<void>;
  /** One-tap: best oldest sharp scene on the left vs today's imagery. */
  quickCompare: () => Promise<void>;
}

let searchAbort: AbortController | null = null;
/** Center of the last executed search — pan-follow skips small nudges. */
let searchedCenter: GeoPoint | null = null;
/** Re-search when the map settles more than half a search box away. */
const PAN_RESEARCH_THRESHOLD = SEARCH_BBOX_DELTA;
let panSearchTimer: ReturnType<typeof setTimeout> | null = null;

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

  activeYear: null,
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

  mapMoved: (center) => {
    const previous = searchedCenter ?? get().center;
    const moved = Math.max(
      Math.abs(center.lon - previous.lon),
      Math.abs(center.lat - previous.lat),
    );
    if (moved < PAN_RESEARCH_THRESHOLD) return;
    // Small settle delay: panning across the country in several flicks
    // should trigger one search at the destination, not one per flick.
    if (panSearchTimer) clearTimeout(panSearchTimer);
    panSearchTimer = setTimeout(() => {
      set({ center, locationName: 'Map view' });
      void get().searchScenesAt(center);
    }, 600);
  },

  searchScenesAt: async (center) => {
    searchAbort?.abort();
    const abort = new AbortController();
    searchAbort = abort;
    searchedCenter = center;
    set({ searchStatus: 'loading' });
    try {
      const result = await sceneSearchService.search(
        {
          spatial: { kind: 'bbox', bbox: bboxAroundPoint(center, SEARCH_BBOX_DELTA) },
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

  selectYear: async (year) => {
    set({ activeYear: year });
    const { scenes, center, selectScene } = get();
    let best = closestSceneToYear(scenes, year, TIMELINE_MATCH_TOLERANCE_YEARS);

    // If nothing lands close to the requested year, run a targeted search
    // for that year window instead of settling for a distant match.
    const CLOSE_ENOUGH_YEARS = 1.5;
    const REFINE_WINDOW_YEARS = 3;
    if (!best || yearDistance(best.captureDate, year) > CLOSE_ENOUGH_YEARS) {
      try {
        const result = await sceneSearchService.search({
          spatial: { kind: 'bbox', bbox: bboxAroundPoint(center, SEARCH_BBOX_DELTA) },
          dateFrom: `${year - REFINE_WINDOW_YEARS}-01-01T00:00:00Z`,
          dateTo: `${year + REFINE_WINDOW_YEARS}-12-31T23:59:59Z`,
          maxCloudCover: DEFAULT_MAX_CLOUD_COVER,
        });
        if (result.scenes.length > 0) {
          const known = new Set(get().scenes.map((scene) => scene.id));
          const merged = [
            ...get().scenes,
            ...result.scenes.filter((scene) => !known.has(scene.id)),
          ].sort((a, b) => a.captureDate.localeCompare(b.captureDate));
          set({ scenes: merged });
          best = closestSceneToYear(merged, year, TIMELINE_MATCH_TOLERANCE_YEARS);
        }
      } catch (error) {
        console.error(`Targeted search for ${year} failed`, error);
      }
    }
    await selectScene(best);
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

/** Pick the scene whose capture date is nearest to the target year. */
export function closestSceneToYear(
  scenes: ImageScene[],
  year: number,
  toleranceYears: number,
): ImageScene | null {
  // A scene with local full-resolution tiles beats everything else within
  // the tolerance window — sharpness matters more than a closer-but-mushy
  // date (a 1962 wide-film preview must not outrank sharp 1966 film).
  let bestTiled: ImageScene | null = null;
  let bestTiledDistance = Infinity;
  for (const scene of scenes) {
    if (scene.metadata['tiled'] !== true || !scene.captureDate) continue;
    const distance = yearDistance(scene.captureDate, year);
    if (distance <= toleranceYears && distance < bestTiledDistance) {
      bestTiled = scene;
      bestTiledDistance = distance;
    }
  }
  if (bestTiled) return bestTiled;

  let best: ImageScene | null = null;
  let bestDistance = Infinity;
  for (const scene of scenes) {
    if (!scene.captureDate) continue;
    const distance = yearDistance(scene.captureDate, year);
    // Prefer displayable scenes (a previewable image beats a metadata-only
    // record), clear skies (full overcast costs up to two "years"), and
    // frames whose preview is actually legible at the current location: a
    // browse image stretched over a huge film footprint (e.g. KH-9 mapping
    // frames spanning >2°) is mush at city zoom, so it costs extra. Scenes
    // served as real tile pyramids (metadata.displayable) are sharp at any
    // zoom and skip both penalties.
    const tiled = scene.metadata['displayable'] === true;
    const displayPenalty = tiled || scene.previewUrl ? 0 : 0.9;
    const cloudPenalty = ((cloudCoverOf(scene) ?? 0) / 100) * 2;
    const span = Math.max(scene.bounds[2] - scene.bounds[0], scene.bounds[3] - scene.bounds[1]);
    const hugeFramePenalty = !tiled && span > 2 ? 1.5 : 0;
    const score = distance + displayPenalty + cloudPenalty + hugeFramePenalty;
    if (score < bestDistance && distance <= toleranceYears) {
      best = scene;
      bestDistance = score;
    }
  }
  return best;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Matches Tailwind's `sm` breakpoint — below it panels render as a bottom sheet. */
function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}
