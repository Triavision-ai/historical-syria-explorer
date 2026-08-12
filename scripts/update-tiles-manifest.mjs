#!/usr/bin/env node
/**
 * Register a tiled scene in public/tiles/index.json so the app serves the
 * local full-resolution tiles instead of the low-res browse preview.
 *
 * Usage: node scripts/update-tiles-manifest.mjs <entityId> <minZoom> <maxZoom>
 * Env:   APPROVED=true  — the placement was set by a human (the align tool's
 *        "Apply permanently" path); marks the scene public. Anything else
 *        leaves approval to be inherited, and only while the placement is
 *        unchanged (see below).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const [entityId, minZoomArg, maxZoomArg, storageArg, ...boundsArgs] = process.argv.slice(2);
const minZoom = Number(minZoomArg ?? 8);
const maxZoom = Number(maxZoomArg ?? 15);
const explicitBounds = boundsArgs.length === 4 ? boundsArgs.map(Number) : null;

const catalog = JSON.parse(await readFile('public/catalog/declass-syria.json', 'utf8'));
const scene = catalog.scenes.find((s) => s.entityId === entityId);
if (!scene) {
  console.error(`Scene ${entityId} not found in catalog`);
  process.exit(1);
}

const manifestPath = 'public/tiles/index.json';
let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
  // First tiled scene.
}
// Spread the previous entry first so keys this script does not manage —
// above all "approved", the human placement sign-off (approval gate rule,
// 2026-08-12) — survive a re-tile. A brand-new entry gets no "approved"
// key: absent means the placement is pending human review.
const previous = manifest[entityId] ?? {};
const bounds = explicitBounds ?? scene.bounds;
const entry = {
  ...previous,
  bounds,
  minZoom,
  maxZoom,
  storage: storageArg === 'repo' ? 'repo' : 'r2',
};

// An approval attests to ONE placement. If this run moved the scene, the
// old sign-off no longer describes what visitors would see, so it lapses
// back to pending unless this run is itself a human approval.
const moved =
  Array.isArray(previous.bounds) &&
  previous.bounds.some((value, i) => Math.abs(value - bounds[i]) > 1e-6);
if (process.env.APPROVED === 'true') {
  entry.approved = true;
} else if (moved) {
  delete entry.approved;
}
manifest[entityId] = entry;
await mkdir('public/tiles', { recursive: true });
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Manifest updated: ${entityId} z${minZoom}-${maxZoom}`);
