import type { ImageScene } from '@/types';

/** Cloud cover percentage (0–100) from provider metadata, if reported. */
export function cloudCoverOf(scene: ImageScene): number | null {
  const value = scene.metadata['eo:cloud_cover'] ?? scene.metadata['cloudCover'];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
