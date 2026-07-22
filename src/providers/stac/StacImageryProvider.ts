import type {
  ImageScene,
  ImageryProvider,
  ProviderCapabilities,
  ProviderStatus,
  SceneLayer,
  SceneSearchQuery,
  BoundingBox,
} from '@/types';
import { geometryBounds } from '@/utils/bbox';
import { ENDPOINTS } from '@/config/providers.config';
import { DEFAULT_SEARCH_LIMIT } from '@/config/app.config';
import { StacClient, buildStacSearchBody, pickAssetHref } from './stacClient';
import type { StacItem } from './stacClient';

export interface StacProviderConfig {
  id: string;
  displayName: string;
  description: string;
  endpoint: string;
  collections: string[];
  temporalRange: { from: number; to: number | 'present' };
  missions: string[];
  attribution: string;
  license: ImageScene['license'];
  /** STAC property used for cloud-cover filtering, if supported. */
  cloudCoverField?: string;
  /** Asset keys to try (in order) for a displayable preview image. */
  previewAssetKeys: string[];
  /** Asset keys to try (in order) for a Cloud-Optimized GeoTIFF. */
  cogAssetKeys: string[];
  /** Map a STAC item to a human-readable mission name. */
  missionOf: (item: StacItem) => string;
  /** Ground resolution in meters for items of this source. */
  resolutionOf: (item: StacItem) => number | undefined;
}

/**
 * Generic imagery provider backed by any STAC API. Concrete sources
 * (Landsat, Sentinel-2, future STAC catalogs) are pure configuration.
 */
export class StacImageryProvider implements ImageryProvider {
  readonly id: string;
  private readonly client: StacClient;

  constructor(private readonly config: StacProviderConfig) {
    this.id = config.id;
    this.client = new StacClient(config.endpoint);
  }

  capabilities(): ProviderCapabilities {
    const { config } = this;
    return {
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      temporalRange: config.temporalRange,
      supportsSearch: true,
      supportsPolygonSearch: true,
      supportsDownload: true,
      supportsPreview: true,
      requiresAuth: false,
      missions: config.missions,
      attribution: config.attribution,
    };
  }

  async status(): Promise<ProviderStatus> {
    return { state: 'ready' };
  }

  async search(query: SceneSearchQuery, signal?: AbortSignal): Promise<ImageScene[]> {
    // An undated query with a plain limit would return only the oldest
    // scenes (results sort by date), leaving decades unrepresented. Sample
    // the archive in buckets instead so every era shows up on the timeline.
    const queries = !query.dateFrom && !query.dateTo ? this.temporalBuckets(query) : [query];
    const perQuery = Math.max(4, Math.ceil((query.limit ?? DEFAULT_SEARCH_LIMIT) / queries.length));

    const settled = await Promise.allSettled(
      queries.map((subQuery) => {
        const body = buildStacSearchBody(
          { ...subQuery, limit: perQuery },
          this.config.collections,
          {
            defaultLimit: DEFAULT_SEARCH_LIMIT,
            ...(this.config.cloudCoverField
              ? { cloudCoverField: this.config.cloudCoverField }
              : {}),
          },
        );
        return this.client.search(body, signal);
      }),
    );

    const seen = new Set<string>();
    const scenes: ImageScene[] = [];
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      for (const item of result.value) {
        const scene = this.toScene(item);
        if (scene && !seen.has(scene.id)) {
          seen.add(scene.id);
          scenes.push(scene);
        }
      }
    }
    return scenes;
  }

  /** Split the provider's temporal range into 5-year sub-queries. */
  private temporalBuckets(query: SceneSearchQuery): SceneSearchQuery[] {
    const BUCKET_YEARS = 5;
    const from = this.config.temporalRange.from;
    const to =
      this.config.temporalRange.to === 'present'
        ? new Date().getUTCFullYear() + 1
        : this.config.temporalRange.to;
    const buckets: SceneSearchQuery[] = [];
    for (let start = from; start < to; start += BUCKET_YEARS) {
      const end = Math.min(start + BUCKET_YEARS, to);
      buckets.push({
        ...query,
        dateFrom: `${start}-01-01T00:00:00Z`,
        dateTo: `${end}-01-01T00:00:00Z`,
      });
    }
    return buckets;
  }

  async load(scene: ImageScene, _signal?: AbortSignal): Promise<SceneLayer | null> {
    const cogUrl = scene.metadata['cogUrl'];
    if (ENDPOINTS.titiler && typeof cogUrl === 'string' && cogUrl.startsWith('http')) {
      return {
        kind: 'raster-tiles',
        urlTemplate: `${ENDPOINTS.titiler}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(cogUrl)}`,
        tileSize: 256,
        bounds: scene.bounds,
        attribution: this.config.attribution,
      };
    }
    if (scene.previewUrl) {
      const [w, s, e, n] = scene.bounds;
      return {
        kind: 'georeferenced-image',
        url: scene.previewUrl,
        coordinates: [
          [w, n],
          [e, n],
          [e, s],
          [w, s],
        ],
        bounds: scene.bounds,
        attribution: this.config.attribution,
      };
    }
    return null;
  }

  async metadata(sceneId: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const nativeId = sceneId.replace(`${this.id}:`, '');
    const items = await this.client.search(
      { collections: this.config.collections, limit: 1, query: { id: { eq: nativeId } } },
      signal,
    );
    return items[0]?.properties ?? {};
  }

  private toScene(item: StacItem): ImageScene | null {
    const captureDate = item.properties['datetime'];
    if (typeof captureDate !== 'string') return null;

    const bounds = this.itemBounds(item);
    if (!bounds) return null;

    const previewUrl = this.httpsOnly(pickAssetHref(item, this.config.previewAssetKeys));
    const cogUrl = this.httpsOnly(pickAssetHref(item, this.config.cogAssetKeys));
    const selfLink = item.links?.find((link) => link.rel === 'self')?.href;
    const resolution = this.config.resolutionOf(item);

    return {
      id: `${this.id}:${item.id}`,
      provider: this.id,
      mission: this.config.missionOf(item),
      captureDate,
      ...(resolution !== undefined ? { resolution } : {}),
      bounds,
      ...(previewUrl ? { thumbnail: previewUrl, previewUrl } : {}),
      ...(selfLink ? { downloadUrl: selfLink } : {}),
      metadata: {
        ...item.properties,
        collection: item.collection,
        ...(cogUrl ? { cogUrl } : {}),
      },
      license: this.config.license,
      ...(item.geometry ? { geometry: item.geometry } : {}),
    };
  }

  private itemBounds(item: StacItem): BoundingBox | null {
    if (item.bbox && item.bbox.length >= 4) {
      const [w, s, e, n] = item.bbox;
      if (w !== undefined && s !== undefined && e !== undefined && n !== undefined) {
        return [w, s, e, n];
      }
    }
    if (item.geometry) return geometryBounds(item.geometry);
    return null;
  }

  private httpsOnly(url: string | undefined): string | undefined {
    return url?.startsWith('https://') ? url : undefined;
  }
}
