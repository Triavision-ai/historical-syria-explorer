import type { ImageScene } from '@/types';
import { cloudCoverOf } from './scene';
import { yearOf } from './date';

/**
 * One tappable marker on the timeline: a real capture event at the current
 * location, labeled with the image's own date. Tapping loads `scene`.
 */
export interface TimelineEvent {
  /** Stable group key: `${year}|${mission}`. */
  key: string;
  /** Best scene of the group — what tapping the event loads. */
  scene: ImageScene;
  /** How many displayable scenes the group collapses. */
  count: number;
  /** Group contains a full-resolution local tile pyramid. */
  hd: boolean;
}

/** Group key an individual scene would fall into. */
export function timelineEventKey(scene: ImageScene): string {
  return `${yearOf(scene.captureDate)}|${scene.mission}`;
}

/**
 * Collapse a scene list into chronological capture events: one event per
 * mission per year, labeled by its best scene's actual date. Only scenes
 * that can really render (sharp tiles or a preview image) qualify — an
 * event on the timeline is a promise of a picture, not an archive record.
 */
export function timelineEvents(scenes: ImageScene[]): TimelineEvent[] {
  const groups = new Map<string, ImageScene[]>();
  for (const scene of scenes) {
    if (!scene.captureDate) continue;
    if (scene.metadata['displayable'] !== true && !scene.previewUrl) continue;
    // Scenes placed only by unverified archive corners render nothing
    // (their preview drape is disabled) — no picture, no timeline event.
    if (scene.metadata['approximatePlacement'] === true && scene.metadata['tiled'] !== true)
      continue;
    const key = timelineEventKey(scene);
    const group = groups.get(key);
    if (group) group.push(scene);
    else groups.set(key, [scene]);
  }
  const events: TimelineEvent[] = [];
  for (const [key, group] of groups) {
    const scene = bestSceneOf(group);
    if (!scene) continue;
    events.push({
      key,
      scene,
      count: group.length,
      hd: group.some((candidate) => candidate.metadata['tiled'] === true),
    });
  }
  return events.sort((a, b) => a.scene.captureDate.localeCompare(b.scene.captureDate));
}

/**
 * Pick the frame worth showing from a group of same-event scenes. Local
 * full-resolution tiles beat everything; after that prefer clear skies and
 * previews that stay legible at city zoom (a browse image stretched over a
 * huge film footprint spanning >2 degrees is mush).
 */
export function bestSceneOf(scenes: ImageScene[]): ImageScene | null {
  let best: ImageScene | null = null;
  let bestScore = Infinity;
  for (const scene of scenes) {
    const tiled = scene.metadata['tiled'] === true;
    const sharp = scene.metadata['displayable'] === true;
    const span = Math.max(scene.bounds[2] - scene.bounds[0], scene.bounds[3] - scene.bounds[1]);
    const score =
      (tiled ? -10 : 0) +
      (sharp || scene.previewUrl ? 0 : 0.9) +
      ((cloudCoverOf(scene) ?? 0) / 100) * 2 +
      (!sharp && span > 2 ? 1.5 : 0);
    if (score < bestScore) {
      best = scene;
      bestScore = score;
    }
  }
  return best;
}
