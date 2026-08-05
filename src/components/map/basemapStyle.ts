import type { StyleSpecification } from 'maplibre-gl';
import { ENDPOINTS } from '@/config/providers.config';
import { MAP_CONFIG } from '@/config/app.config';

/**
 * Layer id of the optional place-name overlay. Kept above every scene
 * overlay so names stay readable over historical film; hidden by default.
 */
export const PLACE_LABELS_LAYER_ID = 'place-labels';

/** The Esri reference tile cache ends around this level; overzoom past it. */
const LABEL_TILES_MAX_ZOOM = 18;

/**
 * Pure-imagery basemap style: a single satellite raster source and a dark
 * background. No vector layers, no streets — the only non-imagery layer is
 * the place-name overlay, which starts hidden and is toggled by the user.
 */
export function createBasemapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      'satellite-base': {
        type: 'raster',
        tiles: [ENDPOINTS.basemapTiles],
        tileSize: 256,
        maxzoom: MAP_CONFIG.maxZoom,
        attribution: ENDPOINTS.basemapAttribution,
      },
      'place-labels': {
        type: 'raster',
        tiles: [ENDPOINTS.labelTiles],
        tileSize: 256,
        maxzoom: LABEL_TILES_MAX_ZOOM,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0a0e14' } },
      { id: 'satellite-base', type: 'raster', source: 'satellite-base' },
      {
        id: PLACE_LABELS_LAYER_ID,
        type: 'raster',
        source: 'place-labels',
        layout: { visibility: 'none' },
        paint: { 'raster-fade-duration': 150 },
      },
    ],
  };
}
