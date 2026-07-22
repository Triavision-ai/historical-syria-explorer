import type {
  ImageScene,
  ImageryProvider,
  ProviderCapabilities,
  ProviderStatus,
  SceneLayer,
  SceneSearchQuery,
} from '@/types';
import { ENDPOINTS } from '@/config/providers.config';
import { SYRIA_BBOX } from '@/config/app.config';
import { fetchJson } from '@/utils/http';

interface WaybackConfigEntry {
  itemID: string;
  itemTitle: string;
  itemURL: string;
}

const RELEASE_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;
const WAYBACK_RESOLUTION_M = 0.5;
const MAX_TILE_ZOOM = 19;

/**
 * Esri World Imagery Wayback: dated snapshots of the high-resolution
 * global imagery basemap, roughly quarterly from 2014 to today. Served as
 * public XYZ tiles with attribution — the legal alternative to Google's
 * closed historical imagery. Ideal for before/after comparisons of the
 * conflict period at street-level sharpness.
 */
export class WaybackProvider implements ImageryProvider {
  readonly id = 'esri-wayback';
  private releasesPromise: Promise<Map<string, WaybackConfigEntry>> | null = null;

  capabilities(): ProviderCapabilities {
    return {
      id: this.id,
      displayName: 'World Imagery Wayback (Esri)',
      description:
        'Dated snapshots of the Esri high-resolution imagery basemap, 2014 to today. ' +
        'Street-level sharpness for recent before/after comparison.',
      temporalRange: { from: 2014, to: 'present' },
      supportsSearch: true,
      supportsPolygonSearch: false,
      supportsDownload: false,
      supportsPreview: true,
      requiresAuth: false,
      missions: ['World Imagery (Maxar, Airbus and partners via Esri)'],
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    };
  }

  async status(): Promise<ProviderStatus> {
    return { state: 'ready' };
  }

  async search(query: SceneSearchQuery, signal?: AbortSignal): Promise<ImageScene[]> {
    const releases = await this.loadReleases(signal);
    const scenes: ImageScene[] = [];
    for (const [releaseNum, entry] of releases) {
      const date = RELEASE_DATE_PATTERN.exec(entry.itemTitle)?.[1];
      if (!date) continue;
      const captureDate = `${date}T00:00:00Z`;
      if (query.dateFrom && captureDate < query.dateFrom) continue;
      if (query.dateTo && captureDate > query.dateTo) continue;
      scenes.push({
        id: `${this.id}:${releaseNum}`,
        provider: this.id,
        mission: 'World Imagery snapshot',
        captureDate,
        resolution: WAYBACK_RESOLUTION_M,
        // The mosaic is global; scope scenes to Syria for this app.
        bounds: SYRIA_BBOX,
        downloadUrl: 'https://livingatlas.arcgis.com/wayback/',
        metadata: {
          releaseNumber: releaseNum,
          releaseTitle: entry.itemTitle,
          displayable: true,
          note:
            'Mosaic snapshot date — the underlying photos in an area may be ' +
            'somewhat older than the release date.',
        },
        license: {
          id: 'esri-master-agreement',
          label: 'Esri World Imagery (free use with attribution)',
          url: 'https://www.esri.com/en-us/legal/terms/full-master-agreement',
          redistributable: false,
        },
      });
    }
    scenes.sort((a, b) => a.captureDate.localeCompare(b.captureDate));
    // Keep one release per quarter to avoid flooding the scene list.
    const perQuarter = new Map<string, ImageScene>();
    for (const scene of scenes) {
      const quarter = `${scene.captureDate.slice(0, 4)}-Q${Math.floor(Number(scene.captureDate.slice(5, 7)) / 4)}`;
      perQuarter.set(quarter, scene);
    }
    return [...perQuarter.values()];
  }

  async load(scene: ImageScene): Promise<SceneLayer | null> {
    const releases = await this.loadReleases();
    const releaseNum = scene.id.replace(`${this.id}:`, '');
    const entry = releases.get(releaseNum);
    if (!entry) return null;
    return {
      kind: 'raster-tiles',
      urlTemplate: entry.itemURL
        .replace('{level}', '{z}')
        .replace('{row}', '{y}')
        .replace('{col}', '{x}'),
      tileSize: 256,
      bounds: scene.bounds,
      maxZoom: MAX_TILE_ZOOM,
      attribution: this.capabilities().attribution,
    };
  }

  async metadata(sceneId: string): Promise<Record<string, unknown>> {
    const releases = await this.loadReleases();
    const entry = releases.get(sceneId.replace(`${this.id}:`, ''));
    return entry ? { ...entry } : {};
  }

  private loadReleases(signal?: AbortSignal): Promise<Map<string, WaybackConfigEntry>> {
    this.releasesPromise ??= fetchJson<Record<string, WaybackConfigEntry>>(
      ENDPOINTS.waybackConfig,
      signal ? { signal } : undefined,
    ).then((config) => new Map(Object.entries(config)));
    return this.releasesPromise;
  }
}
