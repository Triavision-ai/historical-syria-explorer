import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USGSProvider } from './USGSProvider';
import { M2MClient } from './m2mClient';
import { DEFAULT_LOCATION } from '@/config/app.config';
import type { ImageScene } from '@/types';
import type { TiledSceneEntry } from './tilesManifest';
import type * as TilesManifestModule from './tilesManifest';

// Injectable stand-in for public/tiles/index.json: loadTilesManifest caches
// its fetch module-wide, so tests swap the loader rather than the network.
const tilesManifestMock = vi.hoisted(() => ({
  entries: {} as Record<string, TiledSceneEntry>,
}));

vi.mock('./tilesManifest', async (importOriginal) => {
  const actual = await importOriginal<typeof TilesManifestModule>();
  return {
    ...actual,
    loadTilesManifest: () => Promise.resolve(tilesManifestMock.entries),
  };
});

const unconfigured = () => new USGSProvider(new M2MClient('https://example.invalid', '', ''));

const HAMA_ENTITY_ID = 'DZB00402700090H020001';
const HAMA_TILES: TiledSceneEntry = {
  bounds: [36.4508327, 34.8580247, 36.9685313, 35.3540837],
  minZoom: 8,
  maxZoom: 18,
  storage: 'r2',
};

async function searchHama(provider: USGSProvider): Promise<ImageScene> {
  const scenes = await provider.search({
    spatial: { kind: 'point', point: DEFAULT_LOCATION.center },
  });
  const scene = scenes[0];
  if (!scene) throw new Error('Hama scene missing from the curated catalog');
  return scene;
}

beforeEach(() => {
  tilesManifestMock.entries = {};
});

describe('USGSProvider (curated catalog mode)', () => {
  it('reports unconfigured status without credentials', async () => {
    const status = await unconfigured().status();
    expect(status.state).toBe('unconfigured');
  });

  it('finds the KH-7 Hama 1966 scene at the default location', async () => {
    const scenes = await unconfigured().search({
      spatial: { kind: 'point', point: DEFAULT_LOCATION.center },
    });
    expect(scenes).toHaveLength(1);
    const scene = scenes[0];
    expect(scene?.id).toBe('usgs-declass:DZB00402700090H020001');
    expect(scene?.mission).toBe('KH-7 GAMBIT');
    expect(scene?.captureDate).toBe('1966-04-25T00:00:00Z');
    expect(scene?.license.redistributable).toBe(true);
  });

  it('filters by date range', async () => {
    const scenes = await unconfigured().search({
      spatial: { kind: 'point', point: DEFAULT_LOCATION.center },
      dateFrom: '1970-01-01',
    });
    expect(scenes).toHaveLength(0);
  });

  it('returns nothing far away from catalog footprints', async () => {
    const scenes = await unconfigured().search({
      spatial: { kind: 'point', point: { lat: 33.5, lon: 36.3 } },
    });
    expect(scenes).toHaveLength(0);
  });
});

describe('USGSProvider approval gate', () => {
  it('serves the full-resolution pyramid for an approved manifest entry', async () => {
    tilesManifestMock.entries = {
      [HAMA_ENTITY_ID]: { ...HAMA_TILES, approved: true },
    };
    const provider = unconfigured();
    const scene = await searchHama(provider);
    expect(scene.metadata['tiled']).toBe(true);
    expect(scene.metadata['displayable']).toBe(true);
    expect(scene.metadata['approvalPending']).toBeUndefined();

    const layer = await provider.load(scene);
    expect(layer?.kind).toBe('raster-tiles');
    if (layer?.kind !== 'raster-tiles') throw new Error('expected a raster-tiles layer');
    expect(layer.urlTemplate).toContain(`${HAMA_ENTITY_ID}/{z}/{x}/{y}.png`);
    expect(layer.bounds).toEqual(HAMA_TILES.bounds);
    expect(layer.maxZoom).toBe(HAMA_TILES.maxZoom);
  });

  it('renders no overlay while a pyramid awaits human approval', async () => {
    // No "approved" key: the tile run finished but nobody signed off yet.
    tilesManifestMock.entries = { [HAMA_ENTITY_ID]: { ...HAMA_TILES } };
    const provider = unconfigured();
    const scene = await searchHama(provider);
    // The scene stays listed, but flagged pending: no HD badge, excluded
    // from quick compare, and nothing may render on the public map.
    expect(scene.metadata['approvalPending']).toBe(true);
    expect(scene.metadata['tiled']).toBeUndefined();
    expect(scene.metadata['displayable']).toBe(false);

    const layer = await provider.load(scene);
    expect(layer).toBeNull();
  });

  it('rejects an explicit approved: false the same as a missing key', async () => {
    tilesManifestMock.entries = { [HAMA_ENTITY_ID]: { ...HAMA_TILES, approved: false } };
    const provider = unconfigured();
    const scene = await searchHama(provider);
    expect(scene.metadata['approvalPending']).toBe(true);
    expect(await provider.load(scene)).toBeNull();
  });
});
