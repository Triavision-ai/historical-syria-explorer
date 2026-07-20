import type {
  ImageScene,
  ImageryProvider,
  ProviderCapabilities,
  ProviderStatus,
  SceneLayer,
  SceneSearchQuery,
} from '@/types';
import { bboxContains, bboxIntersects, geometryBounds } from '@/utils/bbox';
import { ENDPOINTS, CREDENTIALS } from '@/config/providers.config';
import { SYRIA_BBOX } from '@/config/app.config';
import { M2MClient } from './m2mClient';
import type { M2MSceneResult } from './m2mClient';
import { DECLASS_SCENES, USGS_DECLASS_PROVIDER_ID } from './declassCatalog';

/** M2M dataset names for the declassified collections. */
const DECLASS_DATASETS = ['declassi', 'declassii', 'declassiii'];

/**
 * USGS declassified imagery provider (CORONA KH-4, GAMBIT KH-7, HEXAGON KH-9,
 * 1960–1984).
 *
 * Two modes:
 *  - Without credentials: serves the curated local catalog (metadata only,
 *    ordering via EarthExplorer). Always available.
 *  - With M2M credentials (VITE_USGS_M2M_USERNAME/TOKEN): live scene-search
 *    against the M2M API across all declass datasets.
 */
export class USGSProvider implements ImageryProvider {
  readonly id = USGS_DECLASS_PROVIDER_ID;
  private readonly m2m: M2MClient;

  constructor(
    m2m = new M2MClient(ENDPOINTS.usgsM2M, CREDENTIALS.usgsM2MUsername, CREDENTIALS.usgsM2MToken),
  ) {
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
    return {
      state: 'unconfigured',
      reason:
        'Running on the curated local catalog. Set VITE_USGS_M2M_USERNAME and ' +
        'VITE_USGS_M2M_TOKEN for live M2M search of the full declassified archive.',
    };
  }

  async search(query: SceneSearchQuery, signal?: AbortSignal): Promise<ImageScene[]> {
    if (!this.m2m.isConfigured) return this.searchLocalCatalog(query);

    const perDataset = await Promise.allSettled(
      DECLASS_DATASETS.map((dataset) => this.m2m.sceneSearch(dataset, query, signal)),
    );
    const scenes: ImageScene[] = [];
    perDataset.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const dataset = DECLASS_DATASETS[index] ?? 'declass';
      for (const record of result.value) scenes.push(this.toScene(record, dataset));
    });
    // The curated catalog can contain scenes M2M search misses (or vice
    // versa) — merge with local results, de-duplicated by entity id.
    const seen = new Set(scenes.map((scene) => scene.id));
    for (const scene of this.searchLocalCatalog(query)) {
      if (!seen.has(scene.id)) scenes.push(scene);
    }
    return scenes;
  }

  /**
   * Declassified film products are ordered through EarthExplorer; there is
   * no legally hostable tile/preview source yet, so scenes are not directly
   * displayable. The UI falls back to metadata + ordering links.
   */
  async load(_scene: ImageScene): Promise<SceneLayer | null> {
    return null;
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

  private searchLocalCatalog(query: SceneSearchQuery): ImageScene[] {
    return DECLASS_SCENES.filter((scene) => {
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
      downloadUrl: `${ENDPOINTS.earthExplorer}/scene/metadata/full/${dataset}/${record.entityId}/`,
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
