import type { BoundingBox } from '@/types';

/**
 * Manifest of scenes that have been processed into local full-resolution
 * XYZ tiles by the tile-declass-scene workflow (public/tiles/index.json).
 */
export interface TiledSceneEntry {
  bounds: BoundingBox;
  minZoom: number;
  maxZoom: number;
}

let manifestPromise: Promise<Record<string, TiledSceneEntry>> | null = null;

export function loadTilesManifest(): Promise<Record<string, TiledSceneEntry>> {
  manifestPromise ??= fetchManifest();
  return manifestPromise;
}

async function fetchManifest(): Promise<Record<string, TiledSceneEntry>> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}tiles/index.json`);
    if (!response.ok) return {};
    return (await response.json()) as Record<string, TiledSceneEntry>;
  } catch {
    return {};
  }
}

/** Absolute XYZ template for a tiled scene (MapLibre needs absolute URLs). */
export function tileUrlTemplate(entityId: string): string {
  return new URL(
    `${import.meta.env.BASE_URL}tiles/${entityId}/{z}/{x}/{y}.png`,
    window.location.origin,
  ).toString();
}
