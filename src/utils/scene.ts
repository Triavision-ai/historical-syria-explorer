import type { ImageScene } from '@/types';

/** Cloud cover percentage (0–100) from provider metadata, if reported. */
export function cloudCoverOf(scene: ImageScene): number | null {
  const value = scene.metadata['eo:cloud_cover'] ?? scene.metadata['cloudCover'];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Cap a result list without erasing eras: keep every tiled (full
 * resolution) scene, then fill the remaining slots by sampling the rest
 * evenly across their chronological order. A country-scale viewport can
 * match thousands of catalog records; returning them all buries the UI,
 * while a plain slice would keep only the earliest years.
 */
export function capSceneResults(scenes: ImageScene[], limit: number): ImageScene[] {
  if (scenes.length <= limit) return scenes;
  const tiled = scenes.filter((scene) => scene.metadata['tiled'] === true);
  const rest = scenes
    .filter((scene) => scene.metadata['tiled'] !== true)
    .sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  const slots = Math.max(0, limit - tiled.length);
  const sampled: ImageScene[] = [];
  if (slots > 0) {
    const step = rest.length / slots;
    for (let i = 0; i < slots; i++) {
      const pick = rest[Math.floor(i * step)];
      if (pick) sampled.push(pick);
    }
  }
  return [...tiled, ...sampled];
}
