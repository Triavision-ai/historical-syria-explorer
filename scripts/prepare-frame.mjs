#!/usr/bin/env node
/**
 * Prepare a declassified film frame for georeferencing.
 *
 * Declass products ship the film scan in multiple segments (_a.tif,
 * _b.tif, …) that together cover the frame described by the archive's
 * corner coordinates. This script:
 *   1. finds all segments and reads their pixel sizes,
 *   2. fetches the frame's corner coordinates (M2M scene-metadata, with
 *      catalog-bounds fallback),
 *   3. jointly picks the segment stacking axis and the corner-to-image
 *      assignment whose ground aspect best matches the mosaic pixel aspect,
 *   4. writes a mosaic VRT and prints the ground-control-point arguments.
 *
 * Usage:
 *   node scripts/prepare-frame.mjs <entityId> <datasetName> <tifDir>
 * Env:
 *   USGS_M2M_USERNAME / USGS_M2M_TOKEN  — for scene-metadata corners
 *   CORNER_ORDER — manual override, e.g. "ne,se,sw,nw"
 *
 * Output (stdout):
 *   VRT:<path>
 *   GCPS:-gcp 0 0 <lon> <lat> …
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const M2M_URL = process.env.USGS_M2M_URL ?? 'https://m2m.cr.usgs.gov/api/api/json/stable';
const [entityId, datasetName, tifDir] = process.argv.slice(2);
if (!entityId || !datasetName || !tifDir) {
  console.error('Usage: prepare-frame.mjs <entityId> <datasetName> <tifDir>');
  process.exit(1);
}

// ---------- 1. segments ----------
const files = (await readdir(tifDir, { recursive: true }))
  .filter((name) => /\.tiff?$/i.test(name))
  .sort()
  .map((name) => join(tifDir, name));
if (files.length === 0) {
  console.error(`No TIFF segments found in ${tifDir}`);
  process.exit(1);
}
const segments = files.map((file) => {
  const info = execFileSync('gdalinfo', [file], { encoding: 'utf8' });
  const match = /Size is (\d+), (\d+)/.exec(info);
  if (!match) throw new Error(`No size in gdalinfo for ${file}`);
  return { file, width: Number(match[1]), height: Number(match[2]) };
});
console.error(`segments: ${segments.map((s) => `${s.file} ${s.width}x${s.height}`).join(' | ')}`);

// ---------- 2. corners ----------
async function m2m(endpoint, body, token) {
  const response = await fetch(`${M2M_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Auth-Token': token } : {}) },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (payload.errorCode)
    throw new Error(`${endpoint}: ${payload.errorCode} ${payload.errorMessage}`);
  return payload.data;
}
function findCorner(fields, corner, axis) {
  const pattern = new RegExp(`${corner}\\s*Corner\\s*${axis}\\s*dec`, 'i');
  const field = fields.find((f) => pattern.test(f.fieldName ?? ''));
  const value = Number(field?.value);
  return Number.isFinite(value) ? value : null;
}

let corners = null;
try {
  const token = await m2m('login-token', {
    username: process.env.USGS_M2M_USERNAME,
    token: process.env.USGS_M2M_TOKEN,
  });
  const meta = await m2m('scene-metadata', { datasetName, entityId, metadataType: 'full' }, token);
  const fields = meta?.metadata ?? [];
  const read = (corner) => ({
    lon: findCorner(fields, corner, 'Long'),
    lat: findCorner(fields, corner, 'Lat'),
  });
  const [nw, ne, se, sw] = [read('NW'), read('NE'), read('SE'), read('SW')];
  if ([nw, ne, se, sw].every((c) => c.lon !== null && c.lat !== null)) {
    corners = { nw, ne, se, sw };
  }
  await m2m('logout', {}, token).catch(() => undefined);
} catch (error) {
  console.error(`scene-metadata unavailable (${error.message}); using catalog bounds`);
}
const normalizeCorners = (raw) =>
  Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? { lon: value[0], lat: value[1] } : value,
    ]),
  );

// Permanent per-scene corrections (hand-aligned once, saved forever).
let registryOrder = null;
try {
  const registry = JSON.parse(await readFile('public/tiles/corners.json', 'utf8'));
  const entry = registry[entityId];
  if (entry?.corners) {
    corners = normalizeCorners(entry.corners);
    registryOrder = entry.order ?? null;
    console.error('using calibrated corners from public/tiles/corners.json');
  }
} catch {
  // No registry yet.
}
if (process.env.CORNERS_JSON) {
  corners = normalizeCorners(JSON.parse(process.env.CORNERS_JSON));
  console.error('using CORNERS_JSON override');
}
if (!corners) {
  const catalog = JSON.parse(await readFile('public/catalog/declass-syria.json', 'utf8'));
  const scene = catalog.scenes.find((s) => s.entityId === entityId);
  if (!scene) {
    console.error(`Scene ${entityId} not found in catalog`);
    process.exit(1);
  }
  const [w, s, e, n] = scene.bounds;
  corners = {
    nw: { lon: w, lat: n },
    ne: { lon: e, lat: n },
    se: { lon: e, lat: s },
    sw: { lon: w, lat: s },
  };
}

// ---------- 3. joint stacking-axis and orientation choice ----------
function groundDistance(a, b) {
  const kmPerDegLat = 111.32;
  const kmPerDegLon = kmPerDegLat * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot((a.lon - b.lon) * kmPerDegLon, (a.lat - b.lat) * kmPerDegLat);
}
const clockwise = ['nw', 'ne', 'se', 'sw'];
const mirrored = ['nw', 'sw', 'se', 'ne'];
const rotate = (arr, n) => arr.map((_, i) => arr[(i + n) % arr.length]);
const orders = [];
for (let n = 0; n < 4; n++) orders.push(rotate(clockwise, n), rotate(mirrored, n));

const mosaics = {
  x: {
    width: segments.reduce((sum, s) => sum + s.width, 0),
    height: Math.max(...segments.map((s) => s.height)),
  },
  y: {
    width: Math.max(...segments.map((s) => s.width)),
    height: segments.reduce((sum, s) => sum + s.height, 0),
  },
};

let best = null;
for (const axis of segments.length > 1 ? ['x', 'y'] : ['y']) {
  const { width, height } = mosaics[axis];
  for (const order of orders) {
    const top = groundDistance(corners[order[0]], corners[order[1]]);
    const left = groundDistance(corners[order[0]], corners[order[3]]);
    const score = Math.abs(Math.log(top / left / (width / height)));
    if (!best || score < best.score) best = { axis, order, score, width, height };
  }
}
if (registryOrder) best.order = registryOrder;
if (process.env.CORNER_ORDER) {
  best.order = process.env.CORNER_ORDER.split(',').map((c) => c.trim().toLowerCase());
}
console.error(
  `chosen: axis=${best.axis} order=${best.order.join(',')} mosaic=${best.width}x${best.height} score=${best.score.toFixed(3)}`,
);

// ---------- 4. write VRT and GCPs ----------
let offset = 0;
const sources = segments
  .map((segment) => {
    const xOff = best.axis === 'x' ? offset : 0;
    const yOff = best.axis === 'y' ? offset : 0;
    offset += best.axis === 'x' ? segment.width : segment.height;
    return `    <SimpleSource>
      <SourceFilename relativeToVRT="0">${segment.file}</SourceFilename>
      <SourceBand>1</SourceBand>
      <SrcRect xOff="0" yOff="0" xSize="${segment.width}" ySize="${segment.height}" />
      <DstRect xOff="${xOff}" yOff="${yOff}" xSize="${segment.width}" ySize="${segment.height}" />
    </SimpleSource>`;
  })
  .join('\n');

const vrt = `<VRTDataset rasterXSize="${best.width}" rasterYSize="${best.height}">
  <VRTRasterBand dataType="Byte" band="1">
    <ColorInterp>Gray</ColorInterp>
${sources}
  </VRTRasterBand>
</VRTDataset>
`;
const vrtPath = join(tifDir, 'mosaic.vrt');
await writeFile(vrtPath, vrt);

const [c0, c1, c2, c3] = best.order.map((key) => corners[key]);
const gcps = [
  `-gcp 0 0 ${c0.lon} ${c0.lat}`,
  `-gcp ${best.width} 0 ${c1.lon} ${c1.lat}`,
  `-gcp ${best.width} ${best.height} ${c2.lon} ${c2.lat}`,
  `-gcp 0 ${best.height} ${c3.lon} ${c3.lat}`,
];
console.log(`VRT:${vrtPath}`);
console.log(`GCPS:${gcps.join(' ')}`);
