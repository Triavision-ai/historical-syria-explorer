import { describe, expect, it } from 'vitest';
import { closestSceneToYear } from './useExplorerStore';
import type { ImageScene } from '@/types';

function scene(id: string, captureDate: string, previewUrl?: string): ImageScene {
  return {
    id,
    provider: 'test',
    mission: 'Test',
    captureDate,
    bounds: [36, 35, 37, 36],
    ...(previewUrl ? { previewUrl } : {}),
    metadata: {},
    license: { id: 'public-domain', label: 'Public Domain', redistributable: true },
  };
}

describe('closestSceneToYear', () => {
  const scenes = [
    scene('a', '1966-04-25T00:00:00Z'),
    scene('b', '1985-06-01T00:00:00Z', 'https://example.com/b.jpg'),
    scene('c', '2020-01-15T00:00:00Z', 'https://example.com/c.jpg'),
  ];

  it('picks the nearest capture within tolerance', () => {
    expect(closestSceneToYear(scenes, 1965, 6)?.id).toBe('a');
    expect(closestSceneToYear(scenes, 1985, 6)?.id).toBe('b');
    expect(closestSceneToYear(scenes, 2020, 6)?.id).toBe('c');
  });

  it('returns null when nothing is within tolerance', () => {
    expect(closestSceneToYear(scenes, 2000, 6)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(closestSceneToYear([], 1990, 6)).toBeNull();
  });
});
