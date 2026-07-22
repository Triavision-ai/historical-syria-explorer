import type { StyleSpecification } from 'maplibre-gl';
import { ENDPOINTS } from '@/config/providers.config';
import { MAP_CONFIG } from '@/config/app.config';

/**
 * Pure-imagery basemap style: a single satellite raster source and a dark
 * background. Deliberately no vector layers, no labels, no street names,
 * no place names — imagery only.
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
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0a0e14' } },
      { id: 'satellite-base', type: 'raster', source: 'satellite-base' },
    ],
  };
}
