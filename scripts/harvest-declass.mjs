#!/usr/bin/env node
/**
 * One-time harvest of the USGS declassified imagery catalog over Syria.
 *
 * The declassified archive (CORONA, GAMBIT, HEXAGON — 1960–1984) is closed:
 * no new scenes are ever added. Harvesting it once through the M2M API and
 * committing the result as a static JSON file gives the app permanent,
 * credential-free, Syria-wide coverage, including the official public
 * browse-image URLs used for on-map previews.
 *
 * Usage:
 *   USGS_M2M_USERNAME=you USGS_M2M_TOKEN=xxxx node scripts/harvest-declass.mjs
 *
 * Requirements: a free USGS ERS account (https://ers.cr.usgs.gov/register)
 * with M2M access (https://ers.cr.usgs.gov/profile/access), and an
 * application token (https://ers.cr.usgs.gov/password/appgenerate).
 *
 * Output: public/catalog/declass-syria.json
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const M2M_URL = process.env.USGS_M2M_URL ?? 'https://m2m.cr.usgs.gov/api/api/json/stable';
const USERNAME = process.env.USGS_M2M_USERNAME;
const TOKEN = process.env.USGS_M2M_TOKEN;

/** Syria-wide bounding box (must stay in sync with SYRIA_BBOX in src/config). */
const SYRIA = { west: 35.6, south: 32.3, east: 42.4, north: 37.4 };

/**
 * Dataset aliases are discovered at runtime via the dataset-search endpoint
 * (hardcoded aliases proved wrong: DATASET_INVALID). These patterns map the
 * discovered datasets to mission labels and typical ground resolutions.
 */
const DATASET_INFO = [
  { pattern: /declass.*1|declassi$/i, mission: 'CORONA / ARGON / LANYARD', resolution: 2.7 },
  { pattern: /declass.*2|declassii$/i, mission: 'KH-7 GAMBIT / KH-9 HEXAGON', resolution: 0.6 },
  { pattern: /declass.*3|declassiii$/i, mission: 'KH-9 HEXAGON mapping camera', resolution: 6 },
];

function infoFor(alias, collectionName) {
  const haystack = `${alias} ${collectionName}`;
  return (
    DATASET_INFO.find(({ pattern }) => pattern.test(haystack)) ?? {
      mission: 'Declassified reconnaissance',
      resolution: undefined,
    }
  );
}

const PAGE_SIZE = 1000;
const OUTPUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'catalog',
  'declass-syria.json',
);

if (!USERNAME || !TOKEN) {
  console.error('Missing USGS_M2M_USERNAME / USGS_M2M_TOKEN environment variables.');
  process.exit(1);
}

let sessionToken = null;

async function m2m(endpoint, body) {
  const response = await fetch(`${M2M_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'X-Auth-Token': sessionToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (payload.errorCode) {
    throw new Error(`${endpoint}: ${payload.errorCode} ${payload.errorMessage}`);
  }
  return payload.data;
}

function boundsOf(spatialBounds) {
  if (!spatialBounds?.coordinates) return null;
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  const polygons =
    spatialBounds.type === 'Polygon' ? [spatialBounds.coordinates] : spatialBounds.coordinates;
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
  return [round(w), round(s), round(e), round(n)];
}

const round = (value) => Math.round(value * 1e4) / 1e4;

function pickBrowse(browse) {
  if (!Array.isArray(browse) || browse.length === 0) return {};
  const first = browse[0];
  return {
    ...(first.browsePath ? { browseUrl: first.browsePath } : {}),
    ...(first.thumbnailPath ? { thumbnailUrl: first.thumbnailPath } : {}),
  };
}

async function harvestDataset({ name, mission, resolution }) {
  const scenes = [];
  let startingNumber = 1;
  for (;;) {
    const data = await m2m('scene-search', {
      datasetName: name,
      maxResults: PAGE_SIZE,
      startingNumber,
      sceneFilter: {
        spatialFilter: {
          filterType: 'mbr',
          lowerLeft: { longitude: SYRIA.west, latitude: SYRIA.south },
          upperRight: { longitude: SYRIA.east, latitude: SYRIA.north },
        },
      },
    });
    const results = data.results ?? [];
    for (const record of results) {
      const bounds = boundsOf(record.spatialBounds);
      if (!bounds) continue;
      scenes.push({
        entityId: record.entityId,
        dataset: name,
        mission,
        resolution,
        captureDate: record.temporalCoverage?.startDate ?? '',
        bounds,
        ...(record.spatialBounds ? { geometry: record.spatialBounds } : {}),
        ...pickBrowse(record.browse),
      });
    }
    console.log(`${name}: ${scenes.length}/${data.totalHits ?? '?'} scenes`);
    if (results.length < PAGE_SIZE || scenes.length >= (data.totalHits ?? 0)) break;
    startingNumber += results.length;
  }
  return scenes;
}

console.log('Logging in to USGS M2M…');
sessionToken = await m2m('login-token', { username: USERNAME, token: TOKEN });

console.log('Discovering declassified datasets…');
const found = await m2m('dataset-search', { datasetName: 'declass' });
const datasets = (Array.isArray(found) ? found : [])
  .map((d) => ({
    name: d.datasetAlias,
    collectionName: d.collectionName ?? '',
  }))
  .filter((d) => typeof d.name === 'string' && /declass/i.test(`${d.name} ${d.collectionName}`));

if (datasets.length === 0) {
  console.error('No declassified datasets visible to this account.');
  console.error(
    'Full dataset-search response for debugging:',
    JSON.stringify(found)?.slice(0, 2000),
  );
  process.exit(1);
}
console.log(`Found: ${datasets.map((d) => `${d.name} (${d.collectionName})`).join(', ')}`);

const allScenes = [];
for (const dataset of datasets) {
  const { mission, resolution } = infoFor(dataset.name, dataset.collectionName);
  console.log(`Harvesting ${dataset.name} over Syria…`);
  try {
    allScenes.push(...(await harvestDataset({ name: dataset.name, mission, resolution })));
  } catch (error) {
    // One failing dataset must not sink the whole harvest.
    console.error(`Skipping ${dataset.name}: ${error.message}`);
  }
}

await m2m('logout', {}).catch(() => undefined);

allScenes.sort((a, b) => a.captureDate.localeCompare(b.captureDate));
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  JSON.stringify({ generatedAt: new Date().toISOString(), scenes: allScenes }),
);
console.log(`Wrote ${allScenes.length} scenes to ${OUTPUT}`);
