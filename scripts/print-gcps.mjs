#!/usr/bin/env node
/**
 * Print gdal_translate ground-control-point arguments for a declassified
 * scene, mapping the image corners to the scene's corner coordinates from
 * M2M scene-metadata (falling back to the harvested-catalog bounds).
 *
 * Usage:
 *   node scripts/print-gcps.mjs <entityId> <datasetName> <imageWidth> <imageHeight>
 *
 * Output (single line): -gcp 0 0 <lon> <lat> -gcp <W> 0 ... (NW NE SE SW)
 */

import { readFile } from 'node:fs/promises';

const M2M_URL = process.env.USGS_M2M_URL ?? 'https://m2m.cr.usgs.gov/api/api/json/stable';
const [entityId, datasetName, widthArg, heightArg] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);

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
  const nw = read('NW');
  const ne = read('NE');
  const se = read('SE');
  const sw = read('SW');
  if ([nw, ne, se, sw].every((c) => c.lon !== null && c.lat !== null)) {
    corners = { nw, ne, se, sw };
  }
  await m2m('logout', {}, token).catch(() => undefined);
} catch (error) {
  console.error(`scene-metadata unavailable (${error.message}); falling back to catalog bounds`);
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

const gcps = [
  `-gcp 0 0 ${corners.nw.lon} ${corners.nw.lat}`,
  `-gcp ${width} 0 ${corners.ne.lon} ${corners.ne.lat}`,
  `-gcp ${width} ${height} ${corners.se.lon} ${corners.se.lat}`,
  `-gcp 0 ${height} ${corners.sw.lon} ${corners.sw.lat}`,
];
console.log(gcps.join(' '));
