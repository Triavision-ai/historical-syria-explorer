import { describe, expect, it } from 'vitest';
import { ProviderRegistry } from './registry';
import type { ImageryProvider } from '@/types';

function fakeProvider(id: string): ImageryProvider {
  return {
    id,
    capabilities: () => ({
      id,
      displayName: id,
      description: '',
      temporalRange: { from: 2000, to: 'present' },
      supportsSearch: true,
      supportsPolygonSearch: false,
      supportsDownload: false,
      supportsPreview: false,
      requiresAuth: false,
      missions: [],
      attribution: '',
    }),
    status: async () => ({ state: 'ready' }),
    search: async () => [],
    load: async () => null,
    metadata: async () => ({}),
  };
}

describe('ProviderRegistry', () => {
  it('registers and retrieves providers', () => {
    const registry = new ProviderRegistry().register(fakeProvider('a')).register(fakeProvider('b'));
    expect(registry.get('a').id).toBe('a');
    expect(registry.has('b')).toBe(true);
    expect(registry.all()).toHaveLength(2);
  });

  it('rejects duplicate ids', () => {
    const registry = new ProviderRegistry().register(fakeProvider('a'));
    expect(() => registry.register(fakeProvider('a'))).toThrow(/already registered/);
  });

  it('throws on unknown providers', () => {
    expect(() => new ProviderRegistry().get('nope')).toThrow(/Unknown provider/);
  });
});
