import type { Map as MapLibreMap } from 'maplibre-gl';
import type { SceneLayer } from '@/types';

const OVERLAY_SOURCE_ID = 'scene-overlay-source';
const OVERLAY_LAYER_ID = 'scene-overlay-layer';

/** Replace (or clear) the historical-scene overlay on a map. */
export function setSceneOverlay(map: MapLibreMap, layer: SceneLayer | null, opacity: number): void {
  if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
  if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
  if (!layer) return;

  if (layer.kind === 'raster-tiles') {
    map.addSource(OVERLAY_SOURCE_ID, {
      type: 'raster',
      tiles: [layer.urlTemplate],
      tileSize: layer.tileSize,
      bounds: [...layer.bounds],
      ...(layer.minZoom !== undefined ? { minzoom: layer.minZoom } : {}),
      ...(layer.maxZoom !== undefined ? { maxzoom: layer.maxZoom } : {}),
      ...(layer.attribution ? { attribution: layer.attribution } : {}),
    });
  } else {
    map.addSource(OVERLAY_SOURCE_ID, {
      type: 'image',
      url: layer.url,
      coordinates: layer.coordinates as [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ],
    });
  }

  map.addLayer({
    id: OVERLAY_LAYER_ID,
    type: 'raster',
    source: OVERLAY_SOURCE_ID,
    paint: {
      'raster-opacity': opacity,
      'raster-fade-duration': 150,
    },
  });
}

export function setSceneOverlayOpacity(map: MapLibreMap, opacity: number): void {
  if (map.getLayer(OVERLAY_LAYER_ID)) {
    map.setPaintProperty(OVERLAY_LAYER_ID, 'raster-opacity', opacity);
  }
}
