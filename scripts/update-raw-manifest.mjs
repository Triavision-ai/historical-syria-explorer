#!/usr/bin/env node
/**
 * Register a raw (unplaced) pyramid in public/tiles/raw-index.json so the
 * alignment tool can load the neutral film mosaic from R2 before any
 * geographic placement exists.
 *
 * The raw pyramid carries no georeference: the recorded catalog bounds are
 * ONLY a starting hint for by-eye placement, never an alignment.
 *
 * Usage: node scripts/update-raw-manifest.mjs <entityId> <width> <height> <maxZoom>
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const [entityId, widthArg, heightArg, maxZoomArg] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
const maxZoom = Number(maxZoomArg);
if (
  !entityId ||
  !Number.isInteger(width) ||
  !Number.isInteger(height) ||
  !Number.isInteger(maxZoom) ||
  width <= 0 ||
  height <= 0 ||
  maxZoom < 0
) {
  console.error('Usage: update-raw-manifest.mjs <entityId> <width> <height> <maxZoom>');
  process.exit(1);
}

const catalog = JSON.parse(await readFile('public/catalog/declass-syria.json', 'utf8'));
const scene = catalog.scenes.find((s) => s.entityId === entityId);
if (!scene) {
  console.error(`Scene ${entityId} not found in catalog`);
  process.exit(1);
}
if (!scene.dataset || !Array.isArray(scene.bounds) || scene.bounds.length !== 4) {
  console.error(`Scene ${entityId} is missing dataset or bounds in the catalog`);
  process.exit(1);
}

const manifestPath = 'public/tiles/raw-index.json';
let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
  // First raw pyramid.
}
manifest[entityId] = {
  width,
  height,
  maxZoom,
  tileSize: 256,
  dataset: scene.dataset,
  bounds: scene.bounds,
};
await mkdir('public/tiles', { recursive: true });
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Raw manifest updated: ${entityId} ${width}x${height} z0-${maxZoom}`);
