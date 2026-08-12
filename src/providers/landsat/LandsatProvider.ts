import { StacImageryProvider } from '../stac/StacImageryProvider';
import { ENDPOINTS } from '@/config/providers.config';

const PLATFORM_LABELS: Record<string, string> = {
  'landsat-4': 'Landsat 4 TM',
  'landsat-5': 'Landsat 5 TM',
  'landsat-7': 'Landsat 7 ETM+',
  'landsat-8': 'Landsat 8 OLI',
  'landsat-9': 'Landsat 9 OLI-2',
  LANDSAT_4: 'Landsat 4 TM',
  LANDSAT_5: 'Landsat 5 TM',
  LANDSAT_7: 'Landsat 7 ETM+',
  LANDSAT_8: 'Landsat 8 OLI',
  LANDSAT_9: 'Landsat 9 OLI-2',
};

/**
 * Landsat Collection 2 Level-2 (1982–present) via Microsoft Planetary Computer.
 *
 * Chosen over USGS LandsatLook (broken browser CORS + EROS login on browse
 * paths) and Earth Search (thumbnail redirects to requester-pays S3 with no
 * CORS — MapLibre cannot drape it). Planetary Computer returns CORS `*` on
 * search, `rendered_preview`, and XYZ tilejson.
 */
export function createLandsatProvider(): StacImageryProvider {
  return new StacImageryProvider({
    id: 'landsat',
    displayName: 'Landsat (USGS)',
    description:
      'Landsat Collection 2 Level-2 archive (1982–today) via Microsoft Planetary Computer. Public domain.',
    endpoint: ENDPOINTS.landsatStac,
    collections: ['landsat-c2-l2'],
    temporalRange: { from: 1982, to: 'present' },
    missions: [
      'Landsat 4 TM',
      'Landsat 5 TM',
      'Landsat 7 ETM+',
      'Landsat 8 OLI',
      'Landsat 9 OLI-2',
    ],
    attribution: 'USGS Landsat via Microsoft Planetary Computer',
    license: {
      id: 'public-domain',
      label: 'Public Domain (USGS)',
      url: 'https://www.usgs.gov/emergency-operations-portal/data-policy',
      redistributable: true,
    },
    cloudCoverField: 'eo:cloud_cover',
    previewAssetKeys: ['rendered_preview', 'thumbnail'],
    cogAssetKeys: ['visual'],
    tilejsonAssetKeys: ['tilejson'],
    tileMaxZoom: 13,
    missionOf: (item) => {
      const platform = String(item.properties['platform'] ?? '');
      return PLATFORM_LABELS[platform] ?? (platform.replace(/[_-]/g, ' ') || 'Landsat');
    },
    resolutionOf: () => 30,
  });
}
