import { postJson } from '@/utils/http';
import type { SceneSearchQuery } from '@/types';

/** M2M response envelope: every endpoint wraps its payload like this. */
interface M2MResponse<T> {
  data: T;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface M2MSceneResult {
  entityId: string;
  displayId: string;
  temporalCoverage?: { startDate?: string };
  spatialBounds?: { type: 'Polygon'; coordinates: number[][][] };
  browse?: { browsePath?: string; thumbnailPath?: string }[];
  metadata?: { fieldName: string; value: unknown }[];
}

interface M2MSearchData {
  results: M2MSceneResult[];
}

/**
 * Minimal USGS Machine-to-Machine (M2M) API client.
 * Docs: https://m2m.cr.usgs.gov/api/docs/json/
 *
 * Authentication uses login-token (username + application token generated at
 * https://ers.cr.usgs.gov/password/appgenerate). The session token is cached
 * and refreshed on demand.
 */
export class M2MClient {
  private sessionToken: string | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly appToken: string,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.username && this.appToken);
  }

  private async call<T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.sessionToken) headers['X-Auth-Token'] = this.sessionToken;
    const response = await postJson<M2MResponse<T>>(`${this.baseUrl}/${endpoint}`, body, {
      headers,
      ...(signal ? { signal } : {}),
    });
    if (response.errorCode) {
      throw new Error(`M2M ${endpoint} failed: ${response.errorCode} ${response.errorMessage}`);
    }
    return response.data;
  }

  private async ensureSession(signal?: AbortSignal): Promise<void> {
    if (this.sessionToken) return;
    this.sessionToken = await this.call<string>(
      'login-token',
      { username: this.username, token: this.appToken },
      signal,
    );
  }

  /** Search a dataset (e.g. "declassi", "declassii", "declassiii"). */
  async sceneSearch(
    datasetName: string,
    query: SceneSearchQuery,
    signal?: AbortSignal,
  ): Promise<M2MSceneResult[]> {
    await this.ensureSession(signal);

    const sceneFilter: Record<string, unknown> = {};
    switch (query.spatial.kind) {
      case 'point':
        sceneFilter['spatialFilter'] = {
          filterType: 'geojson',
          geoJson: {
            type: 'Point',
            coordinates: [query.spatial.point.lon, query.spatial.point.lat],
          },
        };
        break;
      case 'bbox':
        sceneFilter['spatialFilter'] = {
          filterType: 'mbr',
          lowerLeft: { longitude: query.spatial.bbox[0], latitude: query.spatial.bbox[1] },
          upperRight: { longitude: query.spatial.bbox[2], latitude: query.spatial.bbox[3] },
        };
        break;
      case 'polygon':
        sceneFilter['spatialFilter'] = {
          filterType: 'geojson',
          geoJson: { type: 'Polygon', coordinates: query.spatial.coordinates },
        };
        break;
    }
    if (query.dateFrom || query.dateTo) {
      sceneFilter['acquisitionFilter'] = {
        start: query.dateFrom ?? '1960-01-01',
        end: query.dateTo ?? new Date().toISOString().slice(0, 10),
      };
    }

    const data = await this.call<M2MSearchData>(
      'scene-search',
      { datasetName, maxResults: query.limit ?? 50, sceneFilter },
      signal,
    );
    return data.results ?? [];
  }

  /** Full metadata for one scene. */
  async sceneMetadata(
    datasetName: string,
    entityId: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    await this.ensureSession(signal);
    return this.call<Record<string, unknown>>(
      'scene-metadata',
      { datasetName, entityId, metadataType: 'full' },
      signal,
    );
  }
}
