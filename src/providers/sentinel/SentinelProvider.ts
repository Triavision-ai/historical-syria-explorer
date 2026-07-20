import { StacImageryProvider } from '../stac/StacImageryProvider';
import { ENDPOINTS } from '@/config/providers.config';

const SENTINEL2_RESOLUTION_M = 10;

/**
 * Sentinel-2 archive (2015–present) via the public Element 84 Earth Search
 * STAC API on AWS. No credentials required. CC-BY-SA-3.0-IGO Copernicus data.
 */
export function createSentinelProvider(): StacImageryProvider {
  return new StacImageryProvider({
    id: 'sentinel2',
    displayName: 'Sentinel-2 (Copernicus)',
    description:
      'ESA Copernicus Sentinel-2 L2A archive from 2015 to today via Earth Search on AWS.',
    endpoint: ENDPOINTS.earthSearchStac,
    collections: ['sentinel-2-l2a'],
    temporalRange: { from: 2015, to: 'present' },
    missions: ['Sentinel-2A', 'Sentinel-2B', 'Sentinel-2C'],
    attribution: 'Contains modified Copernicus Sentinel data',
    license: {
      id: 'CC-BY-SA-3.0-IGO',
      label: 'Copernicus Sentinel Data (free use with attribution)',
      url: 'https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice',
      redistributable: true,
    },
    cloudCoverField: 'eo:cloud_cover',
    previewAssetKeys: ['thumbnail'],
    cogAssetKeys: ['visual'],
    missionOf: (item) => {
      const platform = String(item.properties['platform'] ?? 'sentinel-2');
      return platform.replace(/^sentinel-2([a-z])?$/i, (_, suffix: string | undefined) =>
        suffix ? `Sentinel-2${suffix.toUpperCase()}` : 'Sentinel-2',
      );
    },
    resolutionOf: () => SENTINEL2_RESOLUTION_M,
  });
}
