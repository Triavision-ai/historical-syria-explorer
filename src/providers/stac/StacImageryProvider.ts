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
    const body = buildStacSearchBody(query, this.config.collections, {
      defaultLimit: DEFAULT_SEARCH_LIMIT,
      ...(this.config.cloudCoverField ? { cloudCoverField: this.config.cloudCoverField } : {}),
    });
    const items = await this.client.search(body, signal);
    return items
      .map((item) => this.toScene(item))
      .filter((scene): scene is ImageScene => scene !== null);
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
