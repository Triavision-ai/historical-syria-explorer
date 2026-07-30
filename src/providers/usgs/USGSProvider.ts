import type {
  ImageScene,
  ImageryProvider,
  ProviderCapabilities,
  ProviderStatus,
  SceneLayer,
  SceneSearchQuery,
} from '@/types';
import { bboxContains, bboxIntersects, geometryBounds } from '@/utils/bbox';
import { capSceneResults } from '@/utils/scene';
import { ENDPOINTS, corsSafeImageUrl } from '@/config/providers.config';
import { SYRIA_BBOX, DEFAULT_SEARCH_LIMIT } from '@/config/app.config';
import { M2MClient } from './m2mClient';
import type { M2MSceneResult } from './m2mClient';
import { DECLASS_SCENES, USGS_DECLASS_PROVIDER_ID } from './declassCatalog';
import { loadHarvestedCatalog } from './catalogLoader';
import { loadTilesManifest, tileUrlTemplate } from './tilesManifest';

/** M2M dataset names for the declassified collections. */
const DECLASS_DATASETS = ['declassi', 'declassii', 'declassiii'];

/**
 * USGS declassified imagery provider (CORONA KH-4, GAMBIT KH-7, HEXAGON KH-9,
 * 1960–1984).
 *
 * In the browser this always serves the pre-harvested Syria-wide catalog
 * (public/catalog/declass-syria.json, built once from the M2M API by
 * scripts/harvest-declass.mjs) merged with the curated seed scenes. The
 * declassified archive is closed (1960–1984), so a one-time harvest gives
 * permanent coverage with no runtime credentials — and M2M credentials must
 * never reach the client bundle (they live only in GitHub Actions secrets).
 * The live-M2M mode remains injectable for tests and trusted tooling.
 */
export class USGSProvider implements ImageryProvider {
  readonly id = USGS_DECLASS_PROVIDER_ID;
  private readonly m2m: M2MClient;

  constructor(m2m = new M2MClient(ENDPOINTS.usgsM2M, '', '')) {
    this.m2m = m2m;
  }

  capabilities(): ProviderCapabilities {
    return {
      id: this.id,
      displayName: 'USGS Declassified',
      description:
        'Declassified US reconnaissance imagery (CORONA, GAMBIT, HEXAGON), 1960–1984, ' +
        'via the USGS M2M API and EarthExplorer. Public domain.',
      temporalRange: { from: 1960, to: 1984 },
      supportsSearch: true,
      supportsPolygonSearch: this.m2m.isConfigured,
      supportsDownload: false,
      supportsPreview: false,
      requiresAuth: false,
      missions: ['KH-4A/B CORONA', 'KH-7 GAMBIT', 'KH-9 HEXAGON'],
      attribution: 'U.S. Geological Survey, declassified national imagery',
    };
  }

  async status(): Promise<ProviderStatus> {
    if (this.m2m.isConfigured) return { state: 'ready' };
    const harvested = await loadHarvestedCatalog();
    if (harvested.length > 0) return { state: 'ready' };
    return {
      state: 'unconfigured',
      reason:
        'Running on the curated seed catalog only. Generate the Syria-wide ' +
        'catalog with scripts/harvest-declass.mjs.',
    };
  }

  async search(query: SceneSearchQuery, signal?: AbortSignal): Promise<ImageScene[]> {
    if (!this.m2m.isConfigured) return this.searchStaticCatalogs(query);

    const perDataset = await Promise.allSettled(
      DECLASS_DATASETS.map((dataset) => this.m2m.sceneSearch(dataset, query, signal)),
    );
    const scenes: ImageScene[] = [];
    perDataset.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const dataset = DECLASS_DATASETS[index] ?? 'declass';
      for (const record of result.value) scenes.push(this.toScene(record, dataset));
    });
    // The static catalogs can contain scenes M2M search misses (or vice
    // versa) — merge, de-duplicated by entity id.
    const seen = new Set(scenes.map((scene) => scene.id));
    for (const scene of await this.searchStaticCatalogs(query)) {
      if (!seen.has(scene.id)) scenes.push(scene);
    }
    return scenes;
  }

  /**
   * Harvested scenes carry the official USGS browse image, draped over the
   * scene footprint. Scenes without a browse image (curated seeds before
   * harvesting) stay metadata-only with EarthExplorer ordering links.
   */
  async load(scene: ImageScene): Promise<SceneLayer | null> {
    // Scenes processed by the tile-declass-scene workflow have sharp local
    // tiles — always prefer those over the low-res browse preview.
    const entityId = scene.id.replace(`${this.id}:`, '');
    const tiled = (await loadTilesManifest())[entityId];
    if (tiled) {
      return {
        kind: 'raster-tiles',
        urlTemplate: tileUrlTemplate(entityId, tiled),
        tileSize: 256,
        bounds: tiled.bounds,
        minZoom: tiled.minZoom,
        maxZoom: tiled.maxZoom,
        attribution: 'U.S. Geological Survey, declassified national imagery',
      };
    }

    if (!scene.previewUrl) return null;
    const [w, s, e, n] = scene.bounds;
    return {
      kind: 'georeferenced-image',
      // ims.cr.usgs.gov sends no CORS headers; WebGL textures need them.
      url: corsSafeImageUrl(scene.previewUrl),
      coordinates: [
        [w, n],
        [e, n],
        [e, s],
        [w, s],
      ],
      bounds: scene.bounds,
      attribution: 'U.S. Geological Survey, declassified national imagery',
    };
  }

  async metadata(sceneId: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const local = DECLASS_SCENES.find((scene) => scene.id === sceneId);
    if (local && !this.m2m.isConfigured) return local.metadata;
    const entityId = sceneId.replace(`${this.id}:`, '');
    const dataset = String(local?.metadata['dataset'] ?? 'declassii');
    if (this.m2m.isConfigured) {
      return this.m2m.sceneMetadata(dataset, entityId, signal);
    }
    return local?.metadata ?? {};
  }

  /** Curated seed scenes + the pre-harvested Syria-wide catalog. */
  private async searchStaticCatalogs(query: SceneSearchQuery): Promise<ImageScene[]> {
    const harvested = await loadHarvestedCatalog();
    const harvestedIds = new Set(harvested.map((scene) => scene.id));
    const seeds = DECLASS_SCENES.filter((scene) => !harvestedIds.has(scene.id));
    // Scenes processed into local full-resolution tiles are first-class:
    // mark them so the UI and year matching can prefer them outright.
    const tiled = await loadTilesManifest();
    const withFlags = [...harvested, ...seeds].map((scene) => {
      const entityId = scene.id.replace(`${this.id}:`, '');
      return tiled[entityId]
        ? { ...scene, metadata: { ...scene.metadata, tiled: true, displayable: true } }
        : scene;
    });
    const matches = withFlags.filter((scene) => {
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

  private toScene(record: M2MSceneResult, dataset: string): ImageScene {
    const bounds = record.spatialBounds ? geometryBounds(record.spatialBounds) : SYRIA_BBOX;
    const thumbnail = record.browse?.[0]?.thumbnailPath;
    const preview = record.browse?.[0]?.browsePath;
    const metadata: Record<string, unknown> = { entityId: record.entityId, dataset };
    for (const field of record.metadata ?? []) metadata[field.fieldName] = field.value;

    return {
      id: `${this.id}:${record.entityId}`,
      provider: this.id,
      mission: this.missionFromDataset(dataset),
      captureDate: record.temporalCoverage?.startDate ?? '',
      bounds,
      ...(thumbnail ? { thumbnail } : {}),
      ...(preview ? { previewUrl: preview } : {}),
      downloadUrl: ENDPOINTS.earthExplorer,
      metadata,
      license: {
        id: 'public-domain',
        label: 'Public Domain (declassified US Government imagery)',
        redistributable: true,
      },
      ...(record.spatialBounds ? { geometry: record.spatialBounds } : {}),
    };
  }

  private missionFromDataset(dataset: string): string {
    switch (dataset) {
      case 'declassi':
        return 'KH-1–KH-6 CORONA/ARGON/LANYARD';
      case 'declassii':
        return 'KH-7 GAMBIT / KH-9 HEXAGON';
      case 'declassiii':
        return 'KH-9 HEXAGON mapping camera';
      default:
        return 'Declassified reconnaissance';
    }
  }
}
