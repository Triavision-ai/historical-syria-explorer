import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapCanvas } from './MapCanvas';
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
  const comparing = compareMode && sceneLayer !== null;

  // Fly to a newly chosen location.
  useEffect(() => {
    if (!mainMap || flyRequestId === 0) return;
    mainMap.flyTo({ center: [center.lon, center.lat], zoom, essential: true });
  }, [mainMap, flyRequestId, center, zoom]);

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
          <MapCanvas center={center} zoom={zoom} onMapReady={setCompareMap} />
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
          {/* Corner labels */}
          <span className="pointer-events-none absolute top-20 left-3 z-10 rounded bg-surface-950/75 px-2 py-1 text-xs font-medium text-amber-hl">
            {selectedScene
              ? `${selectedScene.mission} · ${formatCaptureDate(selectedScene.captureDate)}`
              : 'Historical'}
          </span>
          <span className="pointer-events-none absolute top-20 right-3 z-10 rounded bg-surface-950/75 px-2 py-1 text-xs font-medium text-accent-400">
            Current
          </span>
        </>
      )}
    </div>
  );
}
