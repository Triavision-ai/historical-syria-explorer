import { StacImageryProvider } from '../stac/StacImageryProvider';
import type { StacItem } from '../stac/stacClient';
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

/** The MSS instrument (Landsat 1–5) scanned at ~60 m; TM/ETM+/OLI at 30 m. */
function isMss(item: StacItem): boolean {
  const instruments = item.properties['instruments'];
  return (Array.isArray(instruments) ? instruments : [instruments])
    .map((value) => String(value).toLowerCase())
    .includes('mss');
}

/**
 * Landsat Collection 2 (1972–present) via Microsoft Planetary Computer:
 * Level-2 surface reflectance from 1982, plus Level-1 for the MSS era
 * (Landsat 1–5) so the 1970s stay on the timeline.
 *
 * Chosen over USGS LandsatLook (broken browser CORS + EROS login on browse
 * paths) and Earth Search (thumbnail redirects to requester-pays S3 with no
 * CORS — MapLibre cannot drape it). Planetary Computer returns CORS `*` on
 * search, `rendered_preview`, and XYZ tilejson. Diagnosis and migration by
 * Ayham Al Moussallam (github.com/AyhamALMoussallam).
 */
export function createLandsatProvider(): StacImageryProvider {
  return new StacImageryProvider({
    id: 'landsat',
    displayName: 'Landsat (USGS)',
    description:
      'Landsat archive (1972–today), Collection 2 via Microsoft Planetary Computer. Public domain.',
    endpoint: ENDPOINTS.landsatStac,
    collections: ['landsat-c2-l2', 'landsat-c2-l1'],
    temporalRange: { from: 1972, to: 'present' },
    missions: [
      'Landsat 1–5 MSS',
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
      if (isMss(item)) {
        const generation = /(\d+)/.exec(platform)?.[1];
        return generation ? `Landsat ${generation} MSS` : 'Landsat MSS';
      }
      return PLATFORM_LABELS[platform] ?? (platform.replace(/[_-]/g, ' ') || 'Landsat');
    },
    resolutionOf: (item) => (isMss(item) ? 60 : 30),
  });
}
