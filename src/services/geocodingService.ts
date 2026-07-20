import type { BoundingBox, Place } from '@/types';
import { fetchJson } from '@/utils/http';
import { ENDPOINTS } from '@/config/providers.config';
import { SYRIA_BBOX } from '@/config/app.config';

interface NominatimResult {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  address?: { country_code?: string };
}

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/;
const RESULT_LIMIT = 6;

/**
 * Resolves free-text place names (Arabic or English) and raw coordinates to
 * locations, biased to Syria via a viewbox. Backed by OSM Nominatim under
 * its usage policy — endpoint configurable, no scraping.
 */
export class GeocodingService {
  constructor(private readonly baseUrl: string = ENDPOINTS.nominatim) {}

  async search(text: string, signal?: AbortSignal): Promise<Place[]> {
    const coordinate = this.parseCoordinates(text);
    if (coordinate) return [coordinate];

    const params = new URLSearchParams({
      q: text,
      format: 'jsonv2',
      limit: String(RESULT_LIMIT),
      addressdetails: '1',
      viewbox: SYRIA_BBOX.join(','),
      bounded: '1',
      'accept-language': 'en,ar',
    });
    const results = await fetchJson<NominatimResult[]>(
      `${this.baseUrl}/search?${params}`,
      signal ? { signal } : undefined,
    );

    return results.map((result) => ({
      name: result.name ?? result.display_name.split(',')[0] ?? text,
      displayName: result.display_name,
      location: { lat: Number(result.lat), lon: Number(result.lon) },
      ...(result.boundingbox
        ? {
            boundingBox: [
              Number(result.boundingbox[2]),
              Number(result.boundingbox[0]),
              Number(result.boundingbox[3]),
              Number(result.boundingbox[1]),
            ] as BoundingBox,
          }
        : {}),
      ...(result.address?.country_code ? { countryCode: result.address.country_code } : {}),
    }));
  }

  /** Accepts "lat, lon" input like "35.13, 36.76". */
  private parseCoordinates(text: string): Place | null {
    const match = COORDINATE_PATTERN.exec(text);
    if (!match) return null;
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return {
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      displayName: `Coordinates ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      location: { lat, lon },
    };
  }
}
