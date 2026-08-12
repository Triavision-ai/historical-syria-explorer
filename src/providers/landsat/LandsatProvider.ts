import { StacImageryProvider } from '../stac/StacImageryProvider';
import { ENDPOINTS } from '@/config/providers.config';
import type { StacItem } from '../stac/stacClient';

/** Sensor suffix per platform when the item is NOT an MSS scene. */
const SENSOR_LABELS: Record<string, string> = {
  'landsat-4': 'TM',
  'landsat-5': 'TM',
  'landsat-7': 'ETM+',
  'landsat-8': 'OLI',
  'landsat-9': 'OLI-2',
};

/**
 * Landsat 4 and 5 carried both MSS and TM, so the platform name alone is
 * ambiguous — the instruments array is the source of truth.
 */
function isMss(item: StacItem): boolean {
  const instruments = item.properties['instruments'];
  return Array.isArray(instruments) && instruments.includes('mss');
}

/**
 * Landsat archive (1972–present) via Microsoft Planetary Computer:
 * Collection 2 Level-2 (TM/ETM+/OLI, 1982–present) plus Collection 2
 * Level-1 (MSS, 1972–2013) for the early archive.
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
      'Landsat Collection 2 archive (1972–today) via Microsoft Planetary Computer. Public domain.',
    endpoint: ENDPOINTS.landsatStac,
    collections: ['landsat-c2-l2', 'landsat-c2-l1'],
    temporalRange: { from: 1972, to: 'present' },
    missions: [
      'Landsat 1 MSS',
      'Landsat 2 MSS',
      'Landsat 3 MSS',
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
      const name = platform.replace(/[_-]/g, ' ').replace(/^l/, 'L') || 'Landsat';
      if (isMss(item)) return `${name} MSS`;
      const sensor = SENSOR_LABELS[platform.toLowerCase()];
      return sensor ? `${name} ${sensor}` : name;
    },
    /** MSS products are delivered at 60 m pixels; TM/ETM+/OLI at 30 m. */
    resolutionOf: (item) => (isMss(item) ? 60 : 30),
  });
}
