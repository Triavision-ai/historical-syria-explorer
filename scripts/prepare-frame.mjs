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
// Adjacent scanner passes share an overlapping margin; butting them
// edge-to-edge duplicates the seam. Measure the true offsets by content
// (phase correlation); fall back to butt joints if measurement fails.
let placements;
try {
  const out = execFileSync(
    'python3',
    ['scripts/segment-offsets.py', best.axis, ...segments.map((s) => s.file)],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  placements = out
    .trim()
    .split('\n')
    .map((line) => line.trim().split(/\s+/).map(Number));
  if (placements.length !== segments.length || placements.some((p) => p.some(Number.isNaN)))
    throw new Error('bad offsets output');
  console.error(`measured segment offsets: ${placements.map((p) => p.join(',')).join(' | ')}`);
} catch (error) {
  console.error(`overlap measurement failed (${error.message}); using butt joints`);
  let offset = 0;
  placements = segments.map((segment) => {
    const place = best.axis === 'x' ? [offset, 0] : [0, offset];
    offset += best.axis === 'x' ? segment.width : segment.height;
    return place;
  });
}
// Normalize to non-negative offsets and recompute the mosaic envelope.
const minX = Math.min(...placements.map((p) => p[0]));
const minY = Math.min(...placements.map((p) => p[1]));
placements = placements.map(([x, y]) => [x - minX, y - minY]);
best.width = Math.max(...segments.map((s, i) => placements[i][0] + s.width));
best.height = Math.max(...segments.map((s, i) => placements[i][1] + s.height));

const sources = segments
  .map((segment, i) => {
    const [xOff, yOff] = placements[i];
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

// ---------- 4b. rigid placement: the film keeps its scanned shape ----------
// HARD RULE (Ahmad, 2026-08-12): the film is NEVER reshaped. Archive corner
// quads are often crooked (the Raqqa strip's quad was a 2.2x trapezoid) and
// pinning the scan's corners to them shears the image into a shape that no
// move/rotate/scale alignment can ever fix. The quad is therefore used only
// to POSITION the frame: fit the best rotation + uniform scale + translation
// (mirror handled via the corner order's handedness) of the pixel rectangle
// onto the quad, and pin the GCPs to that fitted rectangle. gdalwarp's
// affine then reproduces a pure similarity — no shear, no trapezoid.
const [c0, c1, c2, c3] = best.order.map((key) => corners[key]);
const geo = [c0, c1, c2, c3];
const lat0 = geo.reduce((sum, c) => sum + c.lat, 0) / 4;
const lon0 = geo.reduce((sum, c) => sum + c.lon, 0) / 4;
const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
const ky = 110540;
const G = geo.map((c) => [(c.lon - lon0) * kx, (c.lat - lat0) * ky]);
const pixelCorners = [
  [0, 0],
  [best.width, 0],
  [best.width, best.height],
  [0, best.height],
];
// Flip y so the pixel frame is right-handed like the geographic one.
const P = pixelCorners.map(([x, y]) => [x, -y]);
const centroid = (pts) => [0, 1].map((k) => pts.reduce((sum, p) => sum + p[k], 0) / pts.length);
const cP = centroid(P);
const cG = centroid(G);

function fitSimilarity(reflect) {
  let a = 0;
  let b = 0;
  let pp = 0;
  for (let i = 0; i < 4; i++) {
    const u = reflect ? -(P[i][0] - cP[0]) : P[i][0] - cP[0];
    const v = P[i][1] - cP[1];
    const X = G[i][0] - cG[0];
    const Y = G[i][1] - cG[1];
    a += u * X + v * Y;
    b += u * Y - v * X;
    pp += u * u + v * v;
  }
  const theta = Math.atan2(b, a);
  const scale = Math.hypot(a, b) / pp;
  const map = ([x, y]) => {
    const u = reflect ? -(x - cP[0]) : x - cP[0];
    const v = y - cP[1];
    return [
      cG[0] + scale * (Math.cos(theta) * u - Math.sin(theta) * v),
      cG[1] + scale * (Math.sin(theta) * u + Math.cos(theta) * v),
    ];
  };
  const residual = Math.sqrt(
    P.reduce((sum, p, i) => {
      const m = map(p);
      return sum + (m[0] - G[i][0]) ** 2 + (m[1] - G[i][1]) ** 2;
    }, 0) / 4,
  );
  return { map, residual };
}

const plain = fitSimilarity(false);
const flipped = fitSimilarity(true);
const chosen = flipped.residual < plain.residual ? flipped : plain;
console.error(
  `rigid placement: quad deviates ${(chosen.residual / 1000).toFixed(2)} km RMS from the ` +
    `film's true shape (this twist is NOT applied to the image)` +
    (chosen === flipped ? '; corner order implies a mirrored scan' : ''),
);

const toLonLat = ([X, Y]) => [lon0 + X / kx, lat0 + Y / ky];
const fitted = P.map((p) => toLonLat(chosen.map(p)));
const gcps = pixelCorners.map(
  ([x, y], i) => `-gcp ${x} ${y} ${fitted[i][0].toFixed(7)} ${fitted[i][1].toFixed(7)}`,
);
console.log(`VRT:${vrtPath}`);
console.log(`GCPS:${gcps.join(' ')}`);
// Machine-readable record of the mapping used — the workflow persists this
// to the calibration registry so tools (and re-runs) can build on it. The
// persisted quad is the FITTED rectangle (what is actually on the map),
// not the crooked input.
console.log(`ORDER:${best.order.join(',')}`);
console.log(
  `CORNERS:${JSON.stringify(
    Object.fromEntries(
      best.order.map((key, i) => [key, [+fitted[i][0].toFixed(7), +fitted[i][1].toFixed(7)]]),
    ),
  )}`,
);
