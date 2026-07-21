/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASEMAP_TILES?: string;
  readonly VITE_LANDSAT_STAC?: string;
  readonly VITE_EARTH_SEARCH_STAC?: string;
  readonly VITE_USGS_M2M?: string;
  readonly VITE_EARTH_EXPLORER?: string;
  readonly VITE_NOMINATIM?: string;
  readonly VITE_TITILER?: string;
  readonly VITE_CORS_IMAGE_PROXY?: string;
  readonly VITE_USGS_M2M_USERNAME?: string;
  readonly VITE_USGS_M2M_TOKEN?: string;
  readonly VITE_EE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
