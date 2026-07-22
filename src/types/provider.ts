import type { BoundingBox, GeoPoint } from './geo';
import type { ImageScene, SceneLayer } from './scene';

/** Spatial filter for a scene search: a point, a bbox, or a polygon. */
export type SpatialFilter =
  | { kind: 'point'; point: GeoPoint }
  | { kind: 'bbox'; bbox: BoundingBox }
  | { kind: 'polygon'; coordinates: number[][][] };

/** Temporal + spatial + paging parameters common to all providers. */
export interface SceneSearchQuery {
  spatial: SpatialFilter;
  /** ISO 8601 inclusive lower bound. */
  dateFrom?: string;
  /** ISO 8601 inclusive upper bound. */
  dateTo?: string;
  /** Max scenes to return (provider may return fewer). */
  limit?: number;
  /** Maximum acceptable cloud cover percentage (0–100). */
  maxCloudCover?: number;
}

/** What a provider can and cannot do; drives UI affordances and the AI layer. */
export interface ProviderCapabilities {
  id: string;
  displayName: string;
  description: string;
  /** Earliest acquisition year available through this provider. */
  temporalRange: { from: number; to: number | 'present' };
  supportsSearch: boolean;
  supportsPolygonSearch: boolean;
  supportsDownload: boolean;
  supportsPreview: boolean;
  /** True when the provider works without credentials. */
  requiresAuth: boolean;
  /** Missions/platforms exposed by this provider. */
  missions: string[];
  attribution: string;
}

/** Health/configuration status a provider can report to the UI. */
export type ProviderStatus =
  | { state: 'ready' }
  | { state: 'unconfigured'; reason: string }
  | { state: 'error'; reason: string };

/**
 * The plugin contract. Every imagery source implements this interface and is
 * registered in the ProviderRegistry — nothing else in the app may talk to a
 * provider's native API directly.
 */
export interface ImageryProvider {
  /** Stable registry id, e.g. "usgs-declass", "sentinel2-aws". */
  readonly id: string;

  capabilities(): ProviderCapabilities;

  /** Current availability (e.g. "unconfigured" when credentials are missing). */
  status(): Promise<ProviderStatus>;

  /** Find scenes matching the query, mapped into the unified ImageScene model. */
  search(query: SceneSearchQuery, signal?: AbortSignal): Promise<ImageScene[]>;

  /** Resolve how a scene should be rendered on the map, or null if not displayable. */
  load(scene: ImageScene, signal?: AbortSignal): Promise<SceneLayer | null>;

  /** Fetch full metadata for a scene (may be richer than the search result). */
  metadata(sceneId: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
}

/** Raised when a provider is called before it has been configured. */
export class ProviderNotConfiguredError extends Error {
  constructor(providerId: string, detail: string) {
    super(`Provider "${providerId}" is not configured: ${detail}`);
    this.name = 'ProviderNotConfiguredError';
  }
}
