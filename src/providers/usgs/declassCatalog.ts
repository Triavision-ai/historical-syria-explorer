import type { ImageScene, SceneLicense } from '@/types';
import { ENDPOINTS } from '@/config/providers.config';

export const USGS_DECLASS_PROVIDER_ID = 'usgs-declass';

const PUBLIC_DOMAIN: SceneLicense = {
  id: 'public-domain',
  label: 'Public Domain (declassified US Government imagery)',
  url: 'https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data',
  redistributable: true,
};

/**
 * Curated catalog of known declassified scenes over Syria. This is seed
 * metadata (not imagery): the actual products live in the USGS archive and
 * are ordered through EarthExplorer / the M2M API. The catalog keeps the
 * app useful before M2M credentials are configured and will grow over time.
 *
 * Footprints marked `approximateFootprint: true` are estimated from the
 * mission ground track, not from official corner coordinates.
 */
export const DECLASS_SCENES: ImageScene[] = [
  {
    id: `${USGS_DECLASS_PROVIDER_ID}:DZB00402700090H020001`,
    provider: USGS_DECLASS_PROVIDER_ID,
    mission: 'KH-7 GAMBIT',
    captureDate: '1966-04-25T00:00:00Z',
    resolution: 0.6,
    bounds: [36.5, 34.9, 37.05, 35.4],
    // EarthExplorer has no stable public per-scene deep link; send users to
    // the archive entry point with ordering instructions in the metadata.
    downloadUrl: ENDPOINTS.earthExplorer,
    metadata: {
      entityId: 'DZB00402700090H020001',
      dataset: 'declassii',
      datasetLabel: 'Declassified Satellite Imagery - 2 (KH-7, KH-9)',
      cameraType: 'Surveillance',
      missionNumber: '4027',
      film: 'Black and white panchromatic',
      coverage: 'Hama and surroundings, Syria',
      approximateFootprint: true,
      orderingNote:
        'On EarthExplorer (free account): Data Sets → Declassified Data → ' +
        'Declass 2 (1963 to 1980) → Additional Criteria → Entity ID ' +
        'DZB00402700090H020001 → Results. Scanned product downloadable; ' +
        'on-demand scan if not yet digitized.',
    },
    license: PUBLIC_DOMAIN,
  },
];
