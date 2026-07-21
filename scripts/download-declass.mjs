#!/usr/bin/env node
/**
 * Download the full-resolution product for one declassified scene via the
 * USGS M2M API.
 *
 * Usage:
 *   USGS_M2M_USERNAME=u USGS_M2M_TOKEN=t \
 *     node scripts/download-declass.mjs <entityId> <datasetName> <outDir>
 *
 * Prints the path of the downloaded file on the last line of stdout.
 */

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const M2M_URL = process.env.USGS_M2M_URL ?? 'https://m2m.cr.usgs.gov/api/api/json/stable';
const [entityId, datasetName, outDir] = process.argv.slice(2);
if (!entityId || !datasetName || !outDir) {
  console.error('Usage: download-declass.mjs <entityId> <datasetName> <outDir>');
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
  if (payload.errorCode)
    throw new Error(`${endpoint}: ${payload.errorCode} ${payload.errorMessage}`);
  return payload.data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('Logging in…');
sessionToken = await m2m('login-token', {
  username: process.env.USGS_M2M_USERNAME,
  token: process.env.USGS_M2M_TOKEN,
});

console.log(`Fetching download options for ${entityId}…`);
const options = await m2m('download-options', { datasetName, entityIds: entityId });
const available = (options ?? []).filter((option) => option.available);
if (available.length === 0) {
  console.error('No downloadable product. Options were:', JSON.stringify(options)?.slice(0, 1500));
  console.error('The scene may not be digitized yet - it must be ordered once via EarthExplorer.');
  process.exit(2);
}
// Prefer the largest product (the full-resolution scan).
available.sort((a, b) => (b.filesize ?? 0) - (a.filesize ?? 0));
const product = available[0];
console.log(
  `Product: ${product.productName ?? product.productId} (${Math.round((product.filesize ?? 0) / 1e6)} MB)`,
);

const label = `hse-${Date.now()}`;
const request = await m2m('download-request', {
  downloads: [{ entityId, productId: product.id }],
  label,
});

let urls = (request.availableDownloads ?? []).map((download) => download.url);
if (urls.length === 0) {
  console.log('Download is being prepared, polling…');
  for (let attempt = 0; attempt < 60 && urls.length === 0; attempt++) {
    await sleep(30_000);
    const retrieve = await m2m('download-retrieve', { label });
    urls = [...(retrieve.available ?? []), ...(retrieve.requested ?? [])]
      .filter((download) => download.url)
      .map((download) => download.url);
    console.log(`  attempt ${attempt + 1}: ${urls.length} ready`);
  }
}
if (urls.length === 0) {
  console.error('Timed out waiting for the download to be prepared.');
  process.exit(3);
}

await mkdir(outDir, { recursive: true });
const url = urls[0];
console.log(`Downloading ${url.slice(0, 120)}…`);
const response = await fetch(url);
if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);
const disposition = response.headers.get('content-disposition') ?? '';
const nameMatch = /filename="?([^";]+)"?/.exec(disposition);
const filename = nameMatch?.[1] ?? `${entityId}.download`;
const outPath = join(outDir, filename);
await pipeline(Readable.fromWeb(response.body), createWriteStream(outPath));
await m2m('logout', {}).catch(() => undefined);
console.log(`Saved ${outPath}`);
console.log(outPath);
