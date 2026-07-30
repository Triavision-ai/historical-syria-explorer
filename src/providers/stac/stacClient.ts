import { postJson } from '@/utils/http';
import { isoInterval } from '@/utils/date';
import type { SceneSearchQuery, SceneGeometry } from '@/types';

/** Subset of a STAC Item relevant to this app. */
export interface StacItem {
  id: string;
  collection?: string;
  bbox?: number[];
  geometry?: SceneGeometry | null;
  properties: Record<string, unknown>;
  assets: Record<
    string,
    { href: string; type?: string; title?: string; roles?: string[] } | undefined
  >;
  links?: { rel: string; href: string }[];
}

interface StacSearchResponse {
  features: StacItem[];
}

export interface StacSearchBody {
  collections: string[];
  limit: number;
  bbox?: number[];
  intersects?: unknown;
  datetime?: string;
  query?: Record<string, unknown>;
  sortby?: { field: string; direction: 'asc' | 'desc' }[];
}

/** Translate the app's unified query into a STAC search body. */
export function buildStacSearchBody(
  query: SceneSearchQuery,
  collections: string[],
  options: { cloudCoverField?: string; defaultLimit: number; sortDirection?: 'asc' | 'desc' },
): StacSearchBody {
  const body: StacSearchBody = {
    collections,
    limit: query.limit ?? options.defaultLimit,
    sortby: [{ field: 'properties.datetime', direction: options.sortDirection ?? 'asc' }],
  };

  switch (query.spatial.kind) {
    case 'point':
      body.intersects = {
        type: 'Point',
        coordinates: [query.spatial.point.lon, query.spatial.point.lat],
      };
      break;
    case 'bbox':
      body.bbox = [...query.spatial.bbox];
      break;
    case 'polygon':
      body.intersects = { type: 'Polygon', coordinates: query.spatial.coordinates };
      break;
  }

  const datetime = isoInterval(query.dateFrom, query.dateTo);
  if (datetime) body.datetime = datetime;

  if (query.maxCloudCover !== undefined && options.cloudCoverField) {
    body.query = { [options.cloudCoverField]: { lte: query.maxCloudCover } };
  }

  return body;
}

/** Minimal STAC API client (POST /search). */
export class StacClient {
  constructor(private readonly baseUrl: string) {}

  async search(body: StacSearchBody, signal?: AbortSignal): Promise<StacItem[]> {
    const response = await postJson<StacSearchResponse>(
      `${this.baseUrl}/search`,
      body,
      signal ? { signal } : undefined,
    );
    return response.features ?? [];
  }
}

/** Pick the first asset matching any of the given keys that is an image or COG. */
export function pickAssetHref(item: StacItem, keys: string[]): string | undefined {
  for (const key of keys) {
    const asset = item.assets[key];
    if (asset?.href) return asset.href;
  }
  return undefined;
}
