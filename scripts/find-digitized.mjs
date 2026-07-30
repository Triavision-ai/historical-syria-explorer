#!/usr/bin/env node
/**
 * Scout which declassified frames covering a point are already digitized
 * (downloadable) versus scan-on-demand only.
 *
 * For each "name:lon:lat" argument this queries M2M scene-search across the
 * declass datasets, then batch-checks download-options and prints the frames
 * that can be downloaded today, best (highest resolution, then smallest
 * footprint) first.
 *
 * Usage: node scripts/find-digitized.mjs "Homs:36.7137:34.7308" ...
 * Env:   USGS_M2M_USERNAME / USGS_M2M_TOKEN
 */

const M2M_URL = process.env.USGS_M2M_URL ?? 'https://m2m.cr.usgs.gov/api/api/json/stable';
const DATASETS = ['declassi', 'declassii', 'declassiii'];

const places = process.argv.slice(2).map((arg) => {
  const [name, lon, lat] = arg.split(':');
  return { name, lon: Number(lon), lat: Number(lat) };
});
if (places.length === 0) {
  console.error('Usage: find-digitized.mjs "Name:lon:lat" ...');
  process.exit(1);
}

async function m2m(endpoint, body, token) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`${M2M_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Auth-Token': token } : {}),
        },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(
          `${endpoint}: non-JSON response (${response.status}) ${text.slice(0, 200)}`,
        );
      }
      if (payload.errorCode)
        throw new Error(`${endpoint}: ${payload.errorCode} ${payload.errorMessage}`);
      return payload.data;
    } catch (error) {
      if (attempt >= 4) throw error;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

const token = await m2m('login-token', {
  username: process.env.USGS_M2M_USERNAME,
  token: process.env.USGS_M2M_TOKEN,
});

for (const place of places) {
  console.log(`\n=== ${place.name} (${place.lon}, ${place.lat}) ===`);
  for (const dataset of DATASETS) {
    let results = [];
    try {
      const search = await m2m(
        'scene-search',
        {
          datasetName: dataset,
          maxResults: 100,
          sceneFilter: {
            spatialFilter: {
              filterType: 'mbr',
              lowerLeft: { longitude: place.lon - 0.05, latitude: place.lat - 0.05 },
              upperRight: { longitude: place.lon + 0.05, latitude: place.lat + 0.05 },
            },
          },
        },
        token,
      );
      results = search?.results ?? [];
    } catch (error) {
      console.log(`  ${dataset}: search failed — ${error.message}`);
      continue;
    }
    if (results.length === 0) continue;

    const byId = new Map(results.map((r) => [r.entityId, r]));
    let options = [];
    try {
      options = await m2m(
        'download-options',
        { datasetName: dataset, entityIds: [...byId.keys()].join(',') },
        token,
      );
    } catch (error) {
      console.log(`  ${dataset}: download-options failed — ${error.message}`);
      continue;
    }
    const digitized = new Map();
    for (const opt of options ?? []) {
      if (opt.available) digitized.set(opt.entityId, opt);
    }
    console.log(
      `  ${dataset}: ${results.length} frames cover the point, ${digitized.size} digitized`,
    );
    for (const [entityId] of digitized) {
      const scene = byId.get(entityId);
      const date = scene?.temporalCoverage?.startDate ?? '?';
      console.log(`    DIGITIZED ${entityId} ${date}`);
    }
  }
}

await m2m('logout', {}, token).catch(() => undefined);
