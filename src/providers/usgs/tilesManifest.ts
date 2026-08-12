import type { BoundingBox } from '@/types';
import { ENDPOINTS } from '@/config/providers.config';

/**
 * Manifest of scenes that have been processed into local full-resolution
 * XYZ tiles by the tile-declass-scene workflow (public/tiles/index.json).
 */
export interface TiledSceneEntry {
  bounds: BoundingBox;
  minZoom: number;
  maxZoom: number;
  /** Where the tile pyramid lives: object storage or this repository. */
  storage?: 'r2' | 'repo';
  /**
   * A human approved this scene's placement (approval gate rule,
   * 2026-08-12). Absent means pending: the pyramid exists but must not
   * render on the public map until someone signs off by eye.
   */
  approved?: boolean;
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
export function tileUrlTemplate(entityId: string, entry: TiledSceneEntry): string {
  // Plain concatenation — new URL() would percent-encode the {z}/{x}/{y}
  // placeholders and break MapLibre's template substitution.
  if (entry.storage === 'r2') {
    return `${ENDPOINTS.tilesBase}/tiles/${entityId}/{z}/{x}/{y}.png`;
  }
  // BASE_URL is relative ('./'); resolve it against the page URL first —
  // origin + './' would produce a malformed host. The {z}/{x}/{y} part is
  // appended afterwards so it never goes through URL encoding.
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  return `${base}tiles/${entityId}/{z}/{x}/{y}.png`;
}
