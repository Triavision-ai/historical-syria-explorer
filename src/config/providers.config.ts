/**
 * All external endpoints live here — never inline URLs inside providers or
 * components. Override any value at build time via Vite env variables
 * (see .env.example) without touching code.
 */

const env = import.meta.env;

export const ENDPOINTS = {
  /**
   * Label-free satellite basemap (Esri World Imagery). Used under the Esri
   * "free basemap" terms with mandatory attribution. Contains no street
   * names, place names or Google assets.
   */
  basemapTiles:
    env.VITE_BASEMAP_TILES ??
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  basemapAttribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',

  /** USGS LandsatLook STAC API — public, no key, Landsat 1972–present. */
  landsatStac: env.VITE_LANDSAT_STAC ?? 'https://landsatlook.usgs.gov/stac-server',

  /** Element 84 Earth Search STAC — public, no key, Sentinel-2 2015–present. */
  earthSearchStac: env.VITE_EARTH_SEARCH_STAC ?? 'https://earth-search.aws.element84.com/v1',

  /** USGS M2M API root (requires a free USGS account + application token). */
  usgsM2M: env.VITE_USGS_M2M ?? 'https://m2m.cr.usgs.gov/api/api/json/stable',

  /** USGS EarthExplorer scene landing page prefix (for human-facing links). */
  earthExplorer: env.VITE_EARTH_EXPLORER ?? 'https://earthexplorer.usgs.gov',

  /** OSM Nominatim geocoder — public with fair-use policy (1 req/s, UA header). */
  nominatim: env.VITE_NOMINATIM ?? 'https://nominatim.openstreetmap.org',

  /**
   * Optional TiTiler instance for rendering Cloud-Optimized GeoTIFFs as map
   * tiles. Leave empty to fall back to provider browse previews.
   */
  titiler: env.VITE_TITILER ?? '',

  /**
   * CORS image proxy (wsrv.nl, a free public image CDN). WebGL map textures
   * require CORS headers that some archives (ims.cr.usgs.gov) do not send;
   * previews from such hosts are routed through this proxy for on-map
   * display only. Set empty to disable.
   */
  corsImageProxy: env.VITE_CORS_IMAGE_PROXY ?? 'https://wsrv.nl/?url=',
} as const;

/** Hosts that lack CORS headers and need the image proxy for map display. */
const CORS_PROXY_HOSTS = new Set(['ims.cr.usgs.gov']);

/** Wrap an image URL with the CORS proxy when its host requires it. */
export function corsSafeImageUrl(url: string): string {
  if (!ENDPOINTS.corsImageProxy) return url;
  try {
    if (!CORS_PROXY_HOSTS.has(new URL(url).host)) return url;
  } catch {
    return url;
  }
  return `${ENDPOINTS.corsImageProxy}${encodeURIComponent(url)}`;
}

/** Credentials are only ever read from env — never hardcoded, never committed. */
export const CREDENTIALS = {
  usgsM2MToken: env.VITE_USGS_M2M_TOKEN ?? '',
  usgsM2MUsername: env.VITE_USGS_M2M_USERNAME ?? '',
  earthEngineClientId: env.VITE_EE_CLIENT_ID ?? '',
} as const;
