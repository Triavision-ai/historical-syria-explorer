#!/usr/bin/env node
/**
 * Record the corner mapping a tiling run actually used in the permanent
 * calibration registry (public/tiles/corners.json), so future re-runs and
 * the alignment tool always start from the current truth.
 *
 * Usage: node scripts/update-corners-registry.mjs <entityId> <cornersJson> <order> [note]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const [entityId, cornersJson, orderArg, note] = process.argv.slice(2);
if (!entityId || !cornersJson || !orderArg) {
  console.error('Usage: update-corners-registry.mjs <entityId> <cornersJson> <order> [note]');
  process.exit(1);
}

const registryPath = 'public/tiles/corners.json';
let registry = {};
try {
  registry = JSON.parse(await readFile(registryPath, 'utf8'));
} catch {
  // First entry.
}

const previous = registry[entityId];
registry[entityId] = {
  ...(note || previous?.note ? { note: note ?? previous.note } : {}),
  order: orderArg.split(',').map((c) => c.trim().toLowerCase()),
  corners: JSON.parse(cornersJson),
};
await mkdir('public/tiles', { recursive: true });
await writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');
console.log(`Registry updated: ${entityId}`);
