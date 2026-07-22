#!/usr/bin/env node
/**
 * Register a tiled scene in public/tiles/index.json so the app serves the
 * local full-resolution tiles instead of the low-res browse preview.
 *
 * Usage: node scripts/update-tiles-manifest.mjs <entityId> <minZoom> <maxZoom>
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
manifest[entityId] = {
  bounds: explicitBounds ?? scene.bounds,
  minZoom,
  maxZoom,
  storage: storageArg === 'repo' ? 'repo' : 'r2',
};
await mkdir('public/tiles', { recursive: true });
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Manifest updated: ${entityId} z${minZoom}-${maxZoom}`);
