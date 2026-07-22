import type { BoundingBox, GeoPoint, SceneGeometry } from '@/types';

/** Build a small bbox around a point (delta in degrees). */
export function bboxAroundPoint(point: GeoPoint, delta: number): BoundingBox {
  return [point.lon - delta, point.lat - delta, point.lon + delta, point.lat + delta];
}

export function bboxCenter(bbox: BoundingBox): GeoPoint {
  return { lon: (bbox[0] + bbox[2]) / 2, lat: (bbox[1] + bbox[3]) / 2 };
}

export function bboxContains(bbox: BoundingBox, point: GeoPoint): boolean {
  return (
    point.lon >= bbox[0] && point.lon <= bbox[2] && point.lat >= bbox[1] && point.lat <= bbox[3]
  );
}

export function bboxIntersects(a: BoundingBox, b: BoundingBox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** Convert a bbox to a GeoJSON polygon ring (closed, counter-clockwise). */
export function bboxToPolygon(bbox: BoundingBox): number[][][] {
  const [w, s, e, n] = bbox;
  return [
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
  ];
}

/** Compute the bounding box of a GeoJSON polygon/multipolygon footprint. */
export function geometryBounds(geometry: SceneGeometry): BoundingBox {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const pos of ring) {
        const [lon, lat] = pos;
        if (lon === undefined || lat === undefined) continue;
        w = Math.min(w, lon);
        e = Math.max(e, lon);
        s = Math.min(s, lat);
        n = Math.max(n, lat);
      }
    }
  }
  return [w, s, e, n];
}
