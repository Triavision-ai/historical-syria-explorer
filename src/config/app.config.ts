import type { BoundingBox, GeoPoint } from '@/types';

/** Syria-wide bounding box used to constrain searches and geocoding. */
export const SYRIA_BBOX: BoundingBox = [35.6, 32.3, 42.4, 37.4];

/** Default view: Hama Old City. */
export const DEFAULT_LOCATION: { name: string; center: GeoPoint; zoom: number } = {
  name: 'Hama Old City',
  center: { lat: 35.1318, lon: 36.7578 },
  zoom: 14,
};

/** Years shown on the bottom timeline. */
export const TIMELINE_YEARS: readonly number[] = [
  1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2026,
];

/**
 * When the user picks a timeline year, scenes within this many years of the
 * pick are considered candidates; the closest capture wins.
 */
export const TIMELINE_MATCH_TOLERANCE_YEARS = 6;

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
