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

/** Largest side of a bbox, in degrees. */
export function bboxSpan(bbox: BoundingBox): number {
  return Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
}

/** Grow a bbox by a fraction of its own size on every side. */
export function expandBbox(bbox: BoundingBox, fraction: number): BoundingBox {
  const dLon = (bbox[2] - bbox[0]) * fraction;
  const dLat = (bbox[3] - bbox[1]) * fraction;
  return [bbox[0] - dLon, bbox[1] - dLat, bbox[2] + dLon, bbox[3] + dLat];
}

/** True when `inner` lies entirely inside `outer`. */
export function bboxCovers(outer: BoundingBox, inner: BoundingBox): boolean {
  return (
    inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]
  );
}

/** Shrink a bbox toward its center so neither side exceeds `maxSpan` degrees. */
export function clampBboxSpan(bbox: BoundingBox, maxSpan: number): BoundingBox {
  const center = bboxCenter(bbox);
  const halfLon = Math.min(bbox[2] - bbox[0], maxSpan) / 2;
  const halfLat = Math.min(bbox[3] - bbox[1], maxSpan) / 2;
  return [center.lon - halfLon, center.lat - halfLat, center.lon + halfLon, center.lat + halfLat];
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
