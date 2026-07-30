import type {
  ImageScene,
  ImageryProvider,
  ProviderCapabilities,
  ProviderStatus,
  SceneLayer,
  SceneSearchQuery,
} from '@/types';
import { ENDPOINTS } from '@/config/providers.config';
import { DEFAULT_SEARCH_LIMIT } from '@/config/app.config';
import { bboxContains, bboxIntersects, geometryBounds } from '@/utils/bbox';
import { capSceneResults } from '@/utils/scene';

interface MaxarCatalogRecord {
  id: string;
  event: string;
  captureDate: string;
  bounds: [number, number, number, number];
  visual: string;
  platform?: string;
  gsd?: number;
  quadkey?: string;
}

interface MaxarCatalogFile {
  scenes: MaxarCatalogRecord[];
}

const DEFAULT_GSD_M = 0.4;
const MAX_TILE_ZOOM = 19;

/**
 * Maxar Open Data Program: full-resolution (~30-50 cm) imagery released
 * openly (CC BY-NC 4.0) after major disasters. The 2023 Türkiye–Syria
 * earthquake event covers northwest Syria (Aleppo, Idlib, Lattakia, Hama)
 * with pre- and post-event scenes.
 *
 * A pre-harvested Syria index (public/catalog/maxar-syria.json, built by
 * the harvest-maxar workflow) keeps the app free of runtime dependencies;
 * the Cloud-Optimized GeoTIFFs render as tiles through the configured COG
 * tiler endpoint.
 */
export class MaxarOpenDataProvider implements ImageryProvider {
  readonly id = 'maxar-open';
  private catalogPromise: Promise<ImageScene[]> | null = null;

  capabilities(): ProviderCapabilities {
    return {
      id: this.id,
      displayName: 'Maxar Open Data',
      description:
        'Very-high-resolution Maxar imagery released openly after major disasters; ' +
        'covers northwest Syria around the 2023 earthquake. CC BY-NC 4.0.',
      temporalRange: { from: 2021, to: 'present' },
      supportsSearch: true,
      supportsPolygonSearch: false,
      supportsDownload: true,
      supportsPreview: Boolean(ENDPOINTS.titiler),
      requiresAuth: false,
      missions: ['WorldView-2/3, GeoEye-1 (Maxar)'],
      attribution: '© Maxar Open Data Program (CC BY-NC 4.0)',
    };
  }

  async status(): Promise<ProviderStatus> {
    const scenes = await this.loadCatalog();
    if (scenes.length === 0) {
      return {
        state: 'unconfigured',
        reason: 'Catalog not generated yet — run the "Harvest Maxar Open Data" workflow.',
      };
    }
    return { state: 'ready' };
  }

  async search(query: SceneSearchQuery): Promise<ImageScene[]> {
    const scenes = await this.loadCatalog();
    const matches = scenes.filter((scene) => {
      if (query.dateFrom && scene.captureDate < query.dateFrom) return false;
      if (query.dateTo && scene.captureDate > query.dateTo) return false;
      switch (query.spatial.kind) {
        case 'point':
          return bboxContains(scene.bounds, query.spatial.point);
        case 'bbox':
          return bboxIntersects(scene.bounds, query.spatial.bbox);
        case 'polygon':
          return bboxIntersects(
            scene.bounds,
            geometryBounds({ type: 'Polygon', coordinates: query.spatial.coordinates }),
          );
      }
    });
    return capSceneResults(matches, query.limit ?? DEFAULT_SEARCH_LIMIT);
  }

  async load(scene: ImageScene): Promise<SceneLayer | null> {
    const visual = scene.metadata['cogUrl'];
    if (!ENDPOINTS.titiler || typeof visual !== 'string') return null;
    return {
      kind: 'raster-tiles',
      urlTemplate: `${ENDPOINTS.titiler}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(visual)}`,
      tileSize: 256,
      bounds: scene.bounds,
      maxZoom: MAX_TILE_ZOOM,
      attribution: this.capabilities().attribution,
    };
  }

  async metadata(sceneId: string): Promise<Record<string, unknown>> {
    const scenes = await this.loadCatalog();
    return scenes.find((scene) => scene.id === sceneId)?.metadata ?? {};
  }

  private loadCatalog(): Promise<ImageScene[]> {
    this.catalogPromise ??= this.fetchCatalog();
    return this.catalogPromise;
  }

  private async fetchCatalog(): Promise<ImageScene[]> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}catalog/maxar-syria.json`);
      if (!response.ok) return [];
      const file = (await response.json()) as MaxarCatalogFile;
      return (file.scenes ?? []).map((record) => this.toScene(record));
    } catch {
      return [];
    }
  }

  private toScene(record: MaxarCatalogRecord): ImageScene {
    return {
      id: `${this.id}:${record.id}`,
      provider: this.id,
      mission: record.platform ?? 'Maxar WorldView',
      captureDate: record.captureDate,
      resolution: record.gsd ?? DEFAULT_GSD_M,
      bounds: record.bounds,
      downloadUrl: record.visual,
      metadata: {
        event: record.event,
        cogUrl: record.visual,
        ...(record.quadkey ? { quadkey: record.quadkey } : {}),
        displayable: Boolean(ENDPOINTS.titiler),
      },
      license: {
        id: 'CC-BY-NC-4.0',
        label: 'Maxar Open Data (CC BY-NC 4.0, non-commercial with attribution)',
        url: 'https://registry.opendata.aws/maxar-open-data/',
        redistributable: true,
      },
    };
  }
}
