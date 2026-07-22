import { describe, expect, it } from 'vitest';
import { buildStacSearchBody, pickAssetHref } from './stacClient';
import type { StacItem } from './stacClient';

describe('buildStacSearchBody', () => {
  it('maps a point query to a GeoJSON intersects filter', () => {
    const body = buildStacSearchBody(
      { spatial: { kind: 'point', point: { lat: 35.13, lon: 36.75 } } },
      ['sentinel-2-l2a'],
      { defaultLimit: 30 },
    );
    expect(body.intersects).toEqual({ type: 'Point', coordinates: [36.75, 35.13] });
    expect(body.limit).toBe(30);
    expect(body.collections).toEqual(['sentinel-2-l2a']);
  });

  it('maps bbox, dates and cloud cover', () => {
    const body = buildStacSearchBody(
      {
        spatial: { kind: 'bbox', bbox: [36, 35, 37, 36] },
        dateFrom: '1984-01-01',
        dateTo: '1990-12-31',
        maxCloudCover: 20,
        limit: 5,
      },
      ['landsat-c2l2-sr'],
      { defaultLimit: 30, cloudCoverField: 'eo:cloud_cover' },
    );
    expect(body.bbox).toEqual([36, 35, 37, 36]);
    expect(body.datetime).toBe('1984-01-01/1990-12-31');
    expect(body.query).toEqual({ 'eo:cloud_cover': { lte: 20 } });
    expect(body.limit).toBe(5);
  });
});

describe('pickAssetHref', () => {
  const item: StacItem = {
    id: 'x',
    properties: {},
    assets: {
      thumbnail: { href: 'https://example.com/thumb.jpg' },
      visual: { href: 'https://example.com/visual.tif' },
    },
  };

  it('returns the first matching asset', () => {
    expect(pickAssetHref(item, ['rendered_preview', 'thumbnail'])).toBe(
      'https://example.com/thumb.jpg',
    );
  });

  it('returns undefined when nothing matches', () => {
    expect(pickAssetHref(item, ['nope'])).toBeUndefined();
  });
});
