import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Keep two maps' cameras in lockstep (used by the compare view).
 * Returns a disposer that detaches the listeners.
 */
export function syncMaps(a: MapLibreMap, b: MapLibreMap): () => void {
  let applying = false;

  const copyCamera = (from: MapLibreMap, to: MapLibreMap) => {
    if (applying) return;
    applying = true;
    to.jumpTo({
      center: from.getCenter(),
      zoom: from.getZoom(),
      bearing: from.getBearing(),
      pitch: from.getPitch(),
    });
    applying = false;
  };

  const onMoveA = () => copyCamera(a, b);
  const onMoveB = () => copyCamera(b, a);
  a.on('move', onMoveA);
  b.on('move', onMoveB);
  copyCamera(a, b);

  return () => {
    a.off('move', onMoveA);
    b.off('move', onMoveB);
  };
}
