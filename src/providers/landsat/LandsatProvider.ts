import { StacImageryProvider } from '../stac/StacImageryProvider';
import { ENDPOINTS } from '@/config/providers.config';

const PLATFORM_LABELS: Record<string, string> = {
  LANDSAT_1: 'Landsat 1 MSS',
  LANDSAT_2: 'Landsat 2 MSS',
  LANDSAT_3: 'Landsat 3 MSS',
  LANDSAT_4: 'Landsat 4 TM',
  LANDSAT_5: 'Landsat 5 TM',
  LANDSAT_7: 'Landsat 7 ETM+',
  LANDSAT_8: 'Landsat 8 OLI',
  LANDSAT_9: 'Landsat 9 OLI-2',
};

/** MSS ≈ 60 m; TM/ETM+/OLI ≈ 30 m. */
const MSS_PLATFORMS = new Set(['LANDSAT_1', 'LANDSAT_2', 'LANDSAT_3']);

/**
 * Landsat archive (1972–present) via the public USGS LandsatLook STAC API.
 * No credentials required. Public-domain imagery.
 */
export function createLandsatProvider(): StacImageryProvider {
  return new StacImageryProvider({
    id: 'landsat',
    displayName: 'Landsat (USGS)',
    description:
      'Landsat 1–9 archive from 1972 to today via the USGS LandsatLook STAC API. Public domain.',
    endpoint: ENDPOINTS.landsatStac,
    collections: ['landsat-c2l2-sr'],
    temporalRange: { from: 1972, to: 'present' },
    missions: Object.values(PLATFORM_LABELS),
    attribution: 'USGS Landsat, courtesy of the U.S. Geological Survey',
    license: {
      id: 'public-domain',
      label: 'Public Domain (USGS)',
      url: 'https://www.usgs.gov/emergency-operations-portal/data-policy',
      redistributable: true,
    },
    cloudCoverField: 'eo:cloud_cover',
    previewAssetKeys: ['rendered_preview', 'reduced_resolution_browse', 'thumbnail'],
    cogAssetKeys: ['red', 'visual'],
    missionOf: (item) => {
      const platform = String(item.properties['platform'] ?? '');
      return PLATFORM_LABELS[platform] ?? platform.replace('_', ' ') ?? 'Landsat';
    },
    resolutionOf: (item) =>
      MSS_PLATFORMS.has(String(item.properties['platform'] ?? '')) ? 60 : 30,
  });
}
