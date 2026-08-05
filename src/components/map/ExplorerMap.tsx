import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapCanvas } from './MapCanvas';
import { PLACE_LABELS_LAYER_ID } from './basemapStyle';
import { setSceneOverlay, setSceneOverlayOpacity } from './sceneOverlay';
import { syncMaps } from './mapSync';
import { useExplorerStore } from '@/hooks/useExplorerStore';
import { formatCaptureDate } from '@/utils/date';

/**
 * The explorer's map surface. Renders the label-free satellite basemap,
 * drapes the selected historical scene over it, and — in compare mode —
 * adds a second synced map with a swipe divider (left: historical,
 * right: current).
 */
export function ExplorerMap() {
  const [mainMap, setMainMap] = useState<MapLibreMap | null>(null);
  const [compareMap, setCompareMap] = useState<MapLibreMap | null>(null);
  const [swipe, setSwipe] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  const center = useExplorerStore((state) => state.center);
  const zoom = useExplorerStore((state) => state.zoom);
  const flyRequestId = useExplorerStore((state) => state.flyRequestId);
  const sceneLayer = useExplorerStore((state) => state.sceneLayer);
  const selectedScene = useExplorerStore((state) => state.selectedScene);
  const overlayOpacity = useExplorerStore((state) => state.overlayOpacity);
  const compareMode = useExplorerStore((state) => state.compareMode);
  const compareRightScene = useExplorerStore((state) => state.compareRightScene);
  const compareRightLayer = useExplorerStore((state) => state.compareRightLayer);
  const showLabels = useExplorerStore((state) => state.showLabels);
  const comparing = compareMode && sceneLayer !== null;

  // Toggle the place-name overlay on both map instances.
  useEffect(() => {
    for (const map of [mainMap, compareMap]) {
      if (map?.getLayer(PLACE_LABELS_LAYER_ID)) {
        map.setLayoutProperty(PLACE_LABELS_LAYER_ID, 'visibility', showLabels ? 'visible' : 'none');
      }
    }
  }, [mainMap, compareMap, showLabels]);

  // Fly to a newly chosen location. Only a fly REQUEST may move the camera:
  // pan-follow writes the settled centre back into the store, and depending on
  // `center`/`zoom` here would re-fly on every pan — snapping the user's zoom
  // back to the stale store value they last searched at.
  useEffect(() => {
    if (!mainMap || flyRequestId === 0) return;
    const target = useExplorerStore.getState();
    mainMap.flyTo({
      center: [target.center.lon, target.center.lat],
      zoom: target.zoom,
      essential: true,
    });
  }, [mainMap, flyRequestId]);

  // Apply / clear the historical overlay.
  useEffect(() => {
    if (!mainMap) return;
    setSceneOverlay(mainMap, sceneLayer, comparing ? 1 : overlayOpacity);
    // Opacity is handled by the cheaper effect below; only rebuild on layer change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainMap, sceneLayer, comparing]);

  useEffect(() => {
    if (!mainMap) return;
    setSceneOverlayOpacity(mainMap, comparing ? 1 : overlayOpacity);
  }, [mainMap, overlayOpacity, comparing]);

  // Camera sync while comparing.
  useEffect(() => {
    if (!mainMap || !compareMap) return;
    return syncMaps(mainMap, compareMap);
  }, [mainMap, compareMap]);

  // Follow the user's panning: when the map settles somewhere new, refresh
  // the scene list for that area (no search box needed to explore).
  useEffect(() => {
    if (!mainMap) return;
    const onMoveEnd = () => {
      const c = mainMap.getCenter();
      const b = mainMap.getBounds();
      useExplorerStore
        .getState()
        .mapMoved({ lon: c.lng, lat: c.lat }, [
          b.getWest(),
          b.getSouth(),
          b.getEast(),
          b.getNorth(),
        ]);
    };
    mainMap.on('moveend', onMoveEnd);
    return () => {
      mainMap.off('moveend', onMoveEnd);
    };
  }, [mainMap]);

  // Right side of the compare: another scene, or the current-day basemap.
  useEffect(() => {
    if (!compareMap) return;
    setSceneOverlay(compareMap, compareRightLayer, 1);
  }, [compareMap, compareRightLayer]);

  // Map canvases live in absolutely-positioned wrappers; when compare mode
  // toggles their effective size stays the same, but a resize keeps MapLibre
  // honest after layout changes.
  useEffect(() => {
    mainMap?.resize();
    compareMap?.resize();
  }, [comparing, mainMap, compareMap]);

  const onSwipeDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = container.getBoundingClientRect();
    const move = (clientX: number) => {
      const fraction = (clientX - rect.left) / rect.width;
      setSwipe(Math.min(0.95, Math.max(0.05, fraction)));
    };
    move(event.clientX);
    const onMove = (moveEvent: PointerEvent) => move(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Right / current-day map (only in compare mode, underneath). */}
      {comparing && (
        <div className="absolute inset-0">
          {/* onMapDestroy is load-bearing: without it a destroyed MapLibre
              instance stays in state and a later overlay update on it
              throws inside an effect, unmounting the whole app. */}
          <MapCanvas
            center={center}
            zoom={zoom}
            onMapReady={setCompareMap}
            onMapDestroy={() => setCompareMap(null)}
          />
        </div>
      )}

      {/* Main map: carries the historical overlay; while comparing it is
          revealed only left of the divider via a width-clipped wrapper with
          a full-viewport inner box (clip-path proved unreliable on iOS). */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: comparing ? `${swipe * 100}%` : '100%' }}
      >
        <div className="absolute inset-y-0 left-0" style={{ width: '100vw' }}>
          <MapCanvas
            center={center}
            zoom={zoom}
            withNavControl
            onMapReady={setMainMap}
            onMapDestroy={() => setMainMap(null)}
          />
        </div>
      </div>

      {/* Overlay attribution: MapLibre only shows source attribution for
          raster-tile sources, so georeferenced-image overlays (USGS/STAC
          browse previews) would otherwise display without their required
          provider notice. Render it ourselves for whatever is visible. */}
      {(sceneLayer?.attribution || (comparing && compareRightLayer?.attribution)) && (
        <span className="pointer-events-none absolute bottom-32 left-3 z-10 max-w-[70vw] truncate rounded-md bg-surface-950/70 px-2 py-1 text-[10px] text-gray-400 sm:bottom-24">
          {[
            ...new Set(
              [sceneLayer?.attribution, comparing ? compareRightLayer?.attribution : null].filter(
                Boolean,
              ),
            ),
          ].join(' · ')}
        </span>
      )}

      {comparing && (
        <>
          {/* Swipe divider */}
          <div
            role="slider"
            aria-label="Compare divider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(swipe * 100)}
            tabIndex={0}
            onPointerDown={onSwipeDrag}
            className="absolute top-0 bottom-0 z-20 w-9 -translate-x-1/2 cursor-ew-resize touch-none"
            style={{ left: `${swipe * 100}%` }}
          >
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent-400 bg-surface-900/90 text-accent-400 shadow-lg">
              ⇔
            </div>
          </div>
          {/* Corner labels — below the stacked mobile header so they stay visible. */}
          <span className="pointer-events-none absolute top-36 left-3 z-10 rounded-lg border border-amber-hl/40 bg-surface-950/85 px-2.5 py-1.5 text-xs font-semibold text-amber-hl sm:top-20">
            ◀ {selectedScene ? formatCaptureDate(selectedScene.captureDate) : 'Historical'}
          </span>
          <span className="pointer-events-none absolute top-36 right-3 z-10 rounded-lg border border-accent-400/40 bg-surface-950/85 px-2.5 py-1.5 text-xs font-semibold text-accent-400 sm:top-20">
            {compareRightScene ? formatCaptureDate(compareRightScene.captureDate) : 'Today'} ▶
          </span>
        </>
      )}
    </div>
  );
}
