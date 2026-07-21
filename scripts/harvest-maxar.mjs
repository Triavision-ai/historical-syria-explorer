#!/usr/bin/env node
/**
 * Harvest Maxar Open Data Program items over Syria into a static catalog.
 *
 * Maxar releases full-resolution (~30-50 cm) imagery openly (CC BY-NC 4.0)
 * after major disasters. The opengeos/maxar-open-data project maintains
 * ready-made GeoJSON indexes per event; this script downloads the events
 * relevant to Syria, keeps only features intersecting the Syria bbox, and
 * writes a compact catalog the app serves statically.
 *
 * Usage: node scripts/harvest-maxar.mjs
 * Output: public/catalog/maxar-syria.json
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Events with coverage touching Syria. Extend as new events are released. */
const EVENTS = ['Kahramanmaras-turkey-earthquake-23'];

const INDEX_BASES = [
  'https://raw.githubusercontent.com/opengeos/maxar-open-data/master/datasets',
  'https://raw.githubusercontent.com/opengeos/maxar-open-data/main/datasets',
];

/** Syria-wide bbox (keep in sync with SYRIA_BBOX in src/config). */
const SYRIA = [35.6, 32.3, 42.4, 37.4];

const OUTPUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'catalog',
  'maxar-syria.json',
);

function intersects(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function featureBbox(feature) {
  if (Array.isArray(feature.bbox) && feature.bbox.length >= 4) return feature.bbox;
  const geometry = feature.geometry;
  if (!geometry) return null;
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : (geometry.coordinates ?? []);
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        w = Math.min(w, lon);
        e = Math.max(e, lon);
        s = Math.min(s, lat);
        n = Math.max(n, lat);
      }
    }
  }
  return Number.isFinite(w) ? [w, s, e, n] : null;
}

async function fetchEvent(event) {
  for (const base of INDEX_BASES) {
    const url = `${base}/${event}.geojson`;
    const response = await fetch(url);
    if (response.ok) return response.json();
    console.error(`${url}: HTTP ${response.status}`);
  }
  throw new Error(`No index found for event ${event}`);
}

const round = (value) => Math.round(value * 1e4) / 1e4;
const scenes = [];

for (const event of EVENTS) {
  console.log(`Fetching ${event}…`);
  const collection = await fetchEvent(event);
  const features = collection.features ?? [];
  let kept = 0;
  for (const feature of features) {
    const bbox = featureBbox(feature);
    if (!bbox || !intersects(bbox, SYRIA)) continue;
    const props = feature.properties ?? {};
    const visual = props.visual ?? props.visual_href ?? props['visual '];
    const datetime = props.datetime ?? props.date ?? props.acquired;
    if (typeof visual !== 'string' || typeof datetime !== 'string') continue;
    kept++;
    scenes.push({
      id: `${event}/${props.catalog_id ?? 'cat'}/${props.quadkey ?? kept}`,
      event,
      captureDate: new Date(datetime).toISOString(),
      bounds: bbox.slice(0, 4).map(round),
      visual,
      ...(typeof props.platform === 'string' ? { platform: props.platform } : {}),
      ...(Number.isFinite(props.gsd) ? { gsd: props.gsd } : {}),
      ...(typeof props.quadkey === 'string' ? { quadkey: props.quadkey } : {}),
    });
  }
  console.log(`${event}: kept ${kept}/${features.length} features over Syria`);
}

scenes.sort((a, b) => a.captureDate.localeCompare(b.captureDate));
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify({ generatedAt: new Date().toISOString(), scenes }));
console.log(`Wrote ${scenes.length} scenes to ${OUTPUT}`);
if (scenes.length === 0) process.exit(1);
