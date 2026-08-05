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

  /**
   * Optional place-name overlay (Esri World Boundaries and Places
   * reference layer): transparent tiles with city/town/village names,
   * used under the same Esri terms as the imagery basemap. Off by
   * default — the interface stays imagery-only until the user toggles
   * names on.
   */
  labelTiles:
    env.VITE_LABEL_TILES ??
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',

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
   * TiTiler instance for rendering Cloud-Optimized GeoTIFFs as map tiles
   * (Maxar Open Data, Sentinel-2 full-res). Defaults to the public
   * developmentseed demo instance — fine for light non-commercial use;
   * point at a self-hosted TiTiler for heavier traffic.
   */
  titiler: env.VITE_TITILER ?? 'https://titiler.xyz',

  /**
   * Esri World Imagery Wayback release index — public JSON listing all
   * dated snapshots of the high-res imagery basemap (2014–present).
   */
  waybackConfig:
    env.VITE_WAYBACK_CONFIG ??
    'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json',

  /**
   * Public base URL for full-resolution scene tiles hosted on object
   * storage (Cloudflare R2). Scenes marked storage:"r2" in the tiles
   * manifest stream from here.
   */
  tilesBase: env.VITE_TILES_BASE ?? 'https://pub-f8ac6c500eea43b28591b7b636fc9e3d.r2.dev',

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

/**
 * Public identifiers only. Secrets must never appear here: every VITE_
 * variable is baked into the public browser bundle. USGS M2M credentials
 * are therefore workflow-only (GitHub Actions secrets) — the browser
 * provider always runs against the pre-harvested static catalog. The
 * Earth Engine OAuth client id is public by design.
 */
export const CREDENTIALS = {
  earthEngineClientId: env.VITE_EE_CLIENT_ID ?? '',
} as const;
