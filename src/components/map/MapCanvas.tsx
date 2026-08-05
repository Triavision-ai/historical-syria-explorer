import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createBasemapStyle } from './basemapStyle';
import { MAP_CONFIG } from '@/config/app.config';
import type { GeoPoint } from '@/types';

interface MapCanvasProps {
  center: GeoPoint;
  zoom: number;
  className?: string;
  /** Show zoom buttons (desktop nicety; touch users pinch). */
  withNavControl?: boolean;
  onMapReady: (map: MapLibreMap) => void;
  onMapDestroy?: (map: MapLibreMap) => void;
}

/** Bare MapLibre canvas with the label-free satellite style. */
export function MapCanvas({
  center,
  zoom,
  className,
  withNavControl = false,
  onMapReady,
  onMapDestroy,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onMapReady, onMapDestroy });
  callbacksRef.current = { onMapReady, onMapDestroy };
  // Capture the initial camera once — later camera changes flow through the
  // map API, not through React re-mounts.
  const initialCameraRef = useRef({ center, zoom });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { center: initialCenter, zoom: initialZoom } = initialCameraRef.current;
    const map = new maplibregl.Map({
      container,
      style: createBasemapStyle(),
      center: [initialCenter.lon, initialCenter.lat],
      zoom: initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      attributionControl: {
        compact: true,
        customAttribution:
          'Supported by the <a href="https://ds-fg.com" target="_blank" rel="noopener noreferrer">German-Syrian Research Foundation</a>',
      },
    });
    map.touchZoomRotate.enable();
    // Surface tile/texture load failures (e.g. CORS-blocked overlay images)
    // instead of failing silently.
    map.on('error', (event) => console.warn('[map]', event.error?.message ?? event.error));
    if (withNavControl) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    }

    map.once('load', () => callbacksRef.current.onMapReady(map));

    return () => {
      callbacksRef.current.onMapDestroy?.(map);
      map.remove();
    };
  }, [withNavControl]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}
