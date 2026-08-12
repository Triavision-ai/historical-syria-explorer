#!/usr/bin/env node
/**
 * Prepare a declassified film frame as an UNPLACED raster mosaic.
 *
 * Raw-first pipeline: the film is published as a neutral pixel pyramid so a
 * human can align it by eye BEFORE any geographic bake. Unlike
 * prepare-frame.mjs this script therefore uses NO geography at all — no
 * corner coordinates, no GCPs, no M2M metadata calls. Segments are placed
 * side by side exactly as scanned (overlaps measured by content, with a
 * butt-joint fallback); pixels are never resampled or reshaped.
 *
 * Usage:
 *   node scripts/prepare-raw.mjs <entityId> <tifDir>
 *
 * Output (stdout):
 *   WIDTH:<mosaic px>
 *   HEIGHT:<mosaic px>
 *   VRT:<path>
 */

import { execFileSync } from 'node:child_process';
import { writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const [entityId, tifDir] = process.argv.slice(2);
if (!entityId || !tifDir) {
  console.error('Usage: prepare-raw.mjs <entityId> <tifDir>');
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
console.error(
  `${entityId} segments: ${segments.map((s) => `${s.file} ${s.width}x${s.height}`).join(' | ')}`,
);

// ---------- 2. stacking axis ----------
// Without corner geography the ground-aspect vote from prepare-frame.mjs is
// unavailable. Physically, the scanner splits the film across its SHORT
// dimension, so adjacent passes share their long edge: wide segments stack
// vertically, tall segments stack horizontally. Single segments need no axis
// (prepare-frame.mjs defaults them to 'y' the same way).
const maxWidth = Math.max(...segments.map((s) => s.width));
const maxHeight = Math.max(...segments.map((s) => s.height));
const axis = segments.length > 1 && maxHeight > maxWidth ? 'x' : 'y';
console.error(`stacking axis: ${axis}`);

// ---------- 3. measured overlaps, butt-joint fallback ----------
// Adjacent scanner passes share an overlapping margin; butting them
// edge-to-edge duplicates the seam. Measure the true offsets by content
// (phase correlation); fall back to butt joints if measurement fails.
let placements;
try {
  const out = execFileSync(
    'python3',
    ['scripts/segment-offsets.py', axis, ...segments.map((s) => s.file)],
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
    const place = axis === 'x' ? [offset, 0] : [0, offset];
    offset += axis === 'x' ? segment.width : segment.height;
    return place;
  });
}
// Normalize to non-negative offsets and compute the mosaic envelope.
const minX = Math.min(...placements.map((p) => p[0]));
const minY = Math.min(...placements.map((p) => p[1]));
placements = placements.map(([x, y]) => [x - minX, y - minY]);
const width = Math.max(...segments.map((s, i) => placements[i][0] + s.width));
const height = Math.max(...segments.map((s, i) => placements[i][1] + s.height));

// ---------- 4. write the mosaic VRT ----------
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

const vrt = `<VRTDataset rasterXSize="${width}" rasterYSize="${height}">
  <VRTRasterBand dataType="Byte" band="1">
    <ColorInterp>Gray</ColorInterp>
${sources}
  </VRTRasterBand>
</VRTDataset>
`;
const vrtPath = join(tifDir, 'mosaic.vrt');
await writeFile(vrtPath, vrt);

console.log(`WIDTH:${width}`);
console.log(`HEIGHT:${height}`);
console.log(`VRT:${vrtPath}`);
