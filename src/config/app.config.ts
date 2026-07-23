import type { BoundingBox, GeoPoint } from '@/types';

/** Syria-wide bounding box used to constrain searches and geocoding. */
export const SYRIA_BBOX: BoundingBox = [35.6, 32.3, 42.4, 37.4];

/** Default view: Hama Old City. */
export const DEFAULT_LOCATION: { name: string; center: GeoPoint; zoom: number } = {
  name: 'Hama Old City',
  center: { lat: 35.1318, lon: 36.7578 },
  zoom: 14,
};

/**
 * Cap (degrees) on the viewport-derived search bbox: zoomed out past
 * country scale, searching the whole visible world helps nobody.
 */
export const MAX_SEARCH_BBOX_SPAN = 8;

export const MAP_CONFIG = {
  minZoom: 5,
  maxZoom: 19,
  /** Padding (px) applied when flying to a scene footprint. */
  fitBoundsPadding: 48,
} as const;

/** Default number of scenes requested from each provider per search. */
export const DEFAULT_SEARCH_LIMIT = 30;

/** Default maximum cloud cover (%) for optical scene searches. */
export const DEFAULT_MAX_CLOUD_COVER = 40;
