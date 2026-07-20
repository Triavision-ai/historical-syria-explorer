import { describe, expect, it } from 'vitest';
import { USGSProvider } from './USGSProvider';
import { M2MClient } from './m2mClient';
import { DEFAULT_LOCATION } from '@/config/app.config';

const unconfigured = () => new USGSProvider(new M2MClient('https://example.invalid', '', ''));

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
