/** A WGS84 point. */
export interface GeoPoint {
  lat: number;
  lon: number;
}

/** A WGS84 bounding box: [west, south, east, north]. */
export type BoundingBox = readonly [west: number, south: number, east: number, north: number];

/** Minimal GeoJSON geometry union used by scene footprints. */
export type SceneGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

/** A named place resolved by geocoding. */
export interface Place {
  name: string;
  displayName: string;
  location: GeoPoint;
  boundingBox?: BoundingBox;
  countryCode?: string;
}
