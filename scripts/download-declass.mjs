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
const [entityArg, datasetName, outDir] = process.argv.slice(2);
if (!entityArg || !datasetName || !outDir) {
  console.error('Usage: download-declass.mjs <entityId[,entityId2,…]> <datasetName> <outDir>');
  process.exit(1);
}
/** Candidate scenes, tried in order — many film frames were never scanned. */
const candidates = entityArg
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let sessionToken = null;
/** M2M call with retries — the API intermittently returns HTML error pages. */
async function m2m(endpoint, body) {
  const attempts = 4;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await fetch(`${M2M_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'X-Auth-Token': sessionToken } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      const excerpt = text.slice(0, 300).replace(/\s+/g, ' ');
      console.error(
        `M2M ${endpoint}: HTTP ${response.status}, non-JSON body (attempt ${attempt}/${attempts}): ${excerpt}`,
      );
      if (attempt < attempts) {
        await sleep(8000 * attempt);
        continue;
      }
      throw new Error(`${endpoint}: non-JSON response, HTTP ${response.status}`);
    }
    if (payload.errorCode)
      throw new Error(`${endpoint}: ${payload.errorCode} ${payload.errorMessage}`);
    return payload.data;
  }
  throw new Error(`${endpoint}: unreachable`);
}

console.log('Logging in…');
sessionToken = await m2m('login-token', {
  username: process.env.USGS_M2M_USERNAME,
  token: process.env.USGS_M2M_TOKEN,
});

let entityId = null;
let product = null;
for (const candidate of candidates) {
  console.log(`Fetching download options for ${candidate}…`);
  const options = await m2m('download-options', { datasetName, entityIds: candidate });
  const available = (options ?? []).filter((option) => option.available);
  if (available.length === 0) {
    console.log(`${candidate}: not digitized (no downloadable product), trying next candidate…`);
    continue;
  }
  // Prefer the largest product (the full-resolution scan).
  available.sort((a, b) => (b.filesize ?? 0) - (a.filesize ?? 0));
  entityId = candidate;
  product = available[0];
  break;
}
if (!product) {
  console.error(
    'None of the candidate scenes are digitized. They must be ordered once via EarthExplorer ' +
      '(scan-on-demand), or pick different frames.',
  );
  process.exit(2);
}
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
console.log(`CHOSEN:${entityId}`);
console.log(outPath);
