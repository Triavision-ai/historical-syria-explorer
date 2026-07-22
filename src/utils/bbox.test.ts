import { describe, expect, it } from 'vitest';
import {
  bboxAroundPoint,
  bboxCenter,
  bboxContains,
  bboxIntersects,
  bboxToPolygon,
  geometryBounds,
} from './bbox';

describe('bbox utils', () => {
  it('builds a bbox around a point', () => {
    expect(bboxAroundPoint({ lat: 35, lon: 36 }, 0.5)).toEqual([35.5, 34.5, 36.5, 35.5]);
  });

  it('computes the center', () => {
    expect(bboxCenter([35, 34, 37, 36])).toEqual({ lon: 36, lat: 35 });
  });

  it('tests point containment', () => {
    expect(bboxContains([35, 34, 37, 36], { lon: 36, lat: 35 })).toBe(true);
    expect(bboxContains([35, 34, 37, 36], { lon: 38, lat: 35 })).toBe(false);
  });

  it('tests bbox intersection', () => {
    expect(bboxIntersects([35, 34, 37, 36], [36, 35, 38, 37])).toBe(true);
    expect(bboxIntersects([35, 34, 37, 36], [38, 34, 39, 36])).toBe(false);
  });

  it('converts a bbox to a closed polygon ring', () => {
    const ring = bboxToPolygon([35, 34, 37, 36])[0];
    expect(ring).toHaveLength(5);
    expect(ring?.[0]).toEqual(ring?.[4]);
  });

  it('derives bounds from polygon geometry', () => {
    expect(
      geometryBounds({
        type: 'Polygon',
        coordinates: [
          [
            [36.5, 34.9],
            [37.05, 34.9],
            [37.05, 35.4],
            [36.5, 35.4],
            [36.5, 34.9],
          ],
        ],
      }),
    ).toEqual([36.5, 34.9, 37.05, 35.4]);
  });
});
