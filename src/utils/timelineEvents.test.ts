import { describe, expect, it } from 'vitest';
import { bestSceneOf, timelineEvents } from './timelineEvents';
import type { ImageScene } from '@/types';

function scene(id: string, captureDate: string, overrides: Partial<ImageScene> = {}): ImageScene {
  return {
    id,
    provider: 'test',
    mission: 'Test',
    captureDate,
    bounds: [36, 35, 37, 36],
    metadata: {},
    license: { id: 'public-domain', label: 'Public Domain', redistributable: true },
    ...overrides,
  };
}

const preview = { previewUrl: 'https://example.com/p.jpg' };

describe('timelineEvents', () => {
  it('groups scenes by mission and year, sorted chronologically', () => {
    const events = timelineEvents([
      scene('new', '2020-01-15T00:00:00Z', preview),
      scene('old-a', '1966-04-25T00:00:00Z', { mission: 'KH-7', ...preview }),
      scene('old-b', '1966-05-02T00:00:00Z', { mission: 'KH-7', ...preview }),
    ]);
    expect(events.map((event) => event.key)).toEqual(['1966|KH-7', '2020|Test']);
    expect(events[0]?.count).toBe(2);
  });

  it('excludes scenes with nothing to display', () => {
    const events = timelineEvents([
      scene('archive-only', '1970-01-01T00:00:00Z'),
      scene('shown', '1980-01-01T00:00:00Z', preview),
    ]);
    expect(events.map((event) => event.scene.id)).toEqual(['shown']);
  });

  it('marks groups that contain full-resolution tiles as hd', () => {
    const events = timelineEvents([
      scene('hd', '1966-04-25T00:00:00Z', { metadata: { tiled: true, displayable: true } }),
    ]);
    expect(events[0]?.hd).toBe(true);
  });
});

describe('bestSceneOf', () => {
  it('prefers full-resolution tiles over a closer preview', () => {
    const best = bestSceneOf([
      scene('preview', '1966-04-25T00:00:00Z', preview),
      scene('tiled', '1966-05-02T00:00:00Z', { metadata: { tiled: true, displayable: true } }),
    ]);
    expect(best?.id).toBe('tiled');
  });

  it('prefers clear skies among previews', () => {
    const best = bestSceneOf([
      scene('cloudy', '1980-01-01T00:00:00Z', {
        ...preview,
        metadata: { 'eo:cloud_cover': 90 },
      }),
      scene('clear', '1980-02-01T00:00:00Z', { ...preview, metadata: { 'eo:cloud_cover': 5 } }),
    ]);
    expect(best?.id).toBe('clear');
  });

  it('returns null for an empty group', () => {
    expect(bestSceneOf([])).toBeNull();
  });
});
