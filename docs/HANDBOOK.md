# Operator's Handbook

This document lets a human operate, maintain, and extend Historical Syria
Explorer without any prior knowledge of the project and without AI
assistance. It explains where every piece of data lives, why the structures
look the way they do, how to decode every identifier and number, and gives
step-by-step runbooks for the common tasks.

Contents:

1. [The three machines](#1-the-three-machines)
2. [The tile store: folder structure and the z/x/y numbering](#2-the-tile-store)
3. [Decoding scene identifiers](#3-decoding-scene-identifiers)
4. [The two registry files](#4-the-two-registry-files)
5. [Repository layout](#5-repository-layout)
6. [Runbook: publish a new historical scene](#6-runbook-publish-a-new-historical-scene)
7. [Runbook: fix a scene's alignment](#7-runbook-fix-a-scenes-alignment)
8. [Runbook: credentials and their rotation](#8-runbook-credentials)
9. [Costs and limits](#9-costs-and-limits)
10. [Imagery providers reference](#10-imagery-providers-reference)

---

## 1. The three machines

The project has no traditional server. It is three managed services wired
together; each can be inspected independently:

| Role | Service | Where |
|---|---|---|
| Brain: code, pipelines, small data | GitHub repository | github.com/Triavision-ai/historical-syria-explorer |
| Warehouse: heavy imagery (tile pyramids) | Cloudflare R2 bucket `syria-tiles` | dash.cloudflare.com → R2 |
| Storefront: the public website | GitHub Pages | syria-explorer.com (custom domain; the legacy triavision-ai.github.io/historical-syria-explorer path redirects) |

Everything heavy or automated runs as **GitHub Actions workflows** — recipe
files in `.github/workflows/`. A workflow borrows a temporary Linux machine
from GitHub, follows its recipe, and vanishes. Every past run, with full
logs, is permanently listed under the repository's **Actions** tab. Anyone
with write access to the repository can press **Run workflow** on any of
them — that is the entire "operations interface" of this project.

The website itself is static files: it has no database and no backend. All
dynamic behaviour is the visitor's browser calling public catalog files and
public imagery APIs directly.

## 2. The tile store

### Why tiles at all

A processed spy-film frame is a 1–4 **gigapixel** image. No phone can
download that. Every smooth-zoom map on earth (Google Maps included) solves
this the same way: pre-cut the image into a **pyramid of 256×256-pixel PNG
squares** and let the viewer fetch only the handful of squares under the
current view. Small files ≠ reduced quality: the deepest zoom level of the
pyramid contains every original pixel, losslessly.

### Folder structure in the R2 bucket

```
tiles/
  DZB00402700090H020001/     ← one folder per scene (the USGS entity ID)
    8/                       ← zoom level (small number = zoomed far out)
      154/                   ← tile column (x)
        102.png              ← tile row (y) — one 256×256 square
    9/ 10/ … 18/             ← each deeper level has 4× more tiles
```

The same structure appears under `public/tiles/<entityId>/` for the few
early scenes that were stored in the repository before R2 existed.

### The z/x/y numbering — encode and decode

The numbers are **Web Mercator tile coordinates** ("slippy map" scheme), the
universal standard (OpenStreetMap, Google, Esri all use it). There is
nothing project-specific about them.

- `z` — zoom level. At zoom z the whole world is a 2^z × 2^z grid of
  tiles. z=0 is one tile for the whole earth; z=18 is a grid of 262,144 ×
  262,144 tiles where one pixel ≈ 0.6 m at the equator.
- `x` — column, counting **from the west edge of the world (−180°)
  eastwards**, starting at 0.
- `y` — row, counting **from the north pole southwards** (Mercator-projected),
  starting at 0.

Encode (longitude, latitude, zoom) → (x, y):

```
n = 2^z
x = floor( (lon + 180) / 360 × n )
y = floor( (1 − ln(tan(lat·π/180) + 1/cos(lat·π/180)) / π) / 2 × n )
```

Decode (x, y, z) → the tile's north-west corner (longitude, latitude):

```
n = 2^z
lon = x / n × 360 − 180
lat = atan( sinh( π × (1 − 2·y/n) ) ) × 180/π
```

Worked example: `tiles/DZB00402700090H020001/15/19718/13141.png`
- n = 2^15 = 32768
- lon = 19718/32768×360 − 180 = **36.6284° E**
- lat = atan(sinh(π×(1 − 2×13141/32768)))×180/π ≈ **35.174° N**
- → the square just north-west of Hama, at ~4.8 m/pixel.

Ground resolution per zoom (at these latitudes ≈ ×0.82 of equator values):
z14 ≈ 9.6 m/px, z15 ≈ 4.8, z16 ≈ 2.4, z17 ≈ 1.2, z18 ≈ 0.6 (equator
values). The pipeline picks the deepest zoom automatically as the first
level **at least as fine as the film itself** — never coarser (no detail
lost), never much finer (no fake upsampled gigabytes).

## 3. Decoding scene identifiers

Historical scenes are named by their **USGS entity ID** — the same ID on
EarthExplorer, in the bucket, in the manifests, everywhere. Formats:

**KH-7 GAMBIT (Declass 2), e.g. `DZB00402700090H020001`:**

| Piece | Example | Meaning |
|---|---|---|
| `DZB` | | Declassified KH-7 GAMBIT product |
| next 6 | `004027` | Mission 4027 = 27th KH-7 flight (Apr 1966) |
| next 5 | `00090` | Orbit/pass 90 of that mission |
| letter | `H` | Camera designation |
| next 3 | `020` | Frame 20 on the film roll |
| last 3 | `001` | Product part number |

**KH-9 HEXAGON (Declass 2), e.g. `DZB1210-500184L001001`:** `DZB` + mission
`1210` (10th KH-9 flight, 1975), then product/roll `500184`, `L` camera,
frame `001`, part `001`.

**KH-9 mapping camera (Declass 3), e.g. `D3C1209-100075A007`:** `D3C` +
mission `1209`, roll/product, `A|F` = aft/forward camera, frame number.

**CORONA (Declass 1), e.g. `DS009013039DV181`:** `DS` + mission `9013`,
camera codes, frame 181.

Approximate native ground resolution by family: KH-7 ≈ 0.6–1.2 m (the
sharpest), KH-9 main ≈ 6–9 m, KH-9 mapping ≈ 9 m, CORONA ≈ 2.7–8 m.

Modern scenes use their providers' own IDs (Sentinel-2 granule IDs, Landsat
product IDs, Esri Wayback release numbers) and are never stored by us — they
stream live from the providers' public APIs.

## 4. The two registry files

Both live in `public/tiles/` in the repository, are tiny JSON files, and are
the **single source of truth** connecting the website to the warehouse.
Both are written by the tiling workflow — avoid hand-editing while a run is
active (the workflow commits them and would conflict).

### `public/tiles/index.json` — the tiles manifest

Which scenes have a processed pyramid and where it lives:

```json
{
  "DZB00402700090H020001": {
    "bounds": [west, south, east, north],   // WGS84 degrees
    "minZoom": 8,
    "maxZoom": 18,
    "storage": "r2"        // "r2" = Cloudflare bucket, "repo" = in-repo
  }
}
```

The app checks this file for every declass scene: listed → stream the sharp
pyramid (an "HD" badge appears); not listed → show the low-res USGS browse
preview.

### `public/tiles/corners.json` — the calibration registry

The accumulated human knowledge of where each film frame truly sits:

```json
{
  "DZB00402700090H020001": {
    "note": "who aligned it, how, when",
    "order": ["se", "ne", "nw", "sw"],
    "corners": { "nw": [lon, lat], "ne": …, "se": …, "sw": … }
  }
}
```

Meaning: the four `corners` are the geographic positions of the four
**pixel corners of the stitched film mosaic**, and `order` says which
geographic corner the mosaic's pixel (0,0), (W,0), (W,H), (0,H) map to, in
that sequence. A mirrored scan is expressed naturally here — the corner
sequence simply runs the other way around. Every tiling run reads this file
first (a registry entry beats the archive's unreliable corner labels), and
writes back whatever mapping it used. Alignment done once is therefore
permanent and survives all future re-processing.

## 5. Repository layout

```
src/                    the website (React + TypeScript + MapLibre)
  config/               ALL external URLs and env-based credentials
  providers/            one folder per imagery source (plugin architecture)
  components/, hooks/   UI and state
public/
  align.html            the standalone alignment tool (plain HTML+JS)
  catalog/              harvested scene catalogs (declass, Maxar) — JSON
  catalog/registry.json scene lifecycle registry (see docs/DATA_PIPELINE.md)
  tiles/index.json      tiles manifest        (see §4)
  tiles/corners.json    calibration registry  (see §4)
scripts/                Node/Python used by the pipelines (documented headers)
.github/workflows/
  deploy.yml            build + publish the site on every push to main
  tile-declass-scene.yml  THE pipeline: film → tiles → R2 (see §6)
  harvest-declass.yml   rebuild the Syria-wide declass catalog (one-time)
  harvest-maxar.yml     refresh the Maxar Open Data catalog
  find-digitized.yml    scout which frames near a city are downloadable
  secret-scan.yml       gitleaks credential guard
docs/HANDBOOK.md        this file
docs/DATA_PIPELINE.md   the scene production line and lifecycle registry
```

Rule enforced throughout: **no hardcoded endpoints** (all in
`src/config/providers.config.ts`, overridable by env) and **no credentials
anywhere in code or history** (GitHub Actions secrets only).

## 6. Runbook: publish a new historical scene

Goal: a 1960s–80s film frame of some city, sharp and aligned, on the site.
Time: ~15 min of human attention + 1–3 h of machine time.

1. **Find candidate frames.** Actions → *Find digitized declass frames* →
   Run workflow, with `Name:lon:lat` for your place (defaults cover the
   seven major cities). The log lists, per dataset, which frames covering
   the point are `DIGITIZED` (instantly downloadable). Prefer `DZB004…`
   (KH-7, sharpest), then `DZB12…` (KH-9), then `D3C…` (mapping camera).
   Check each candidate's look (clouds!) via its EarthExplorer browse image.
   If nothing is digitized, order a free scan-on-demand on EarthExplorer
   (arrives in days-weeks), or pick another frame.
2. **Run the pipeline.** Actions → *Tile a declassified scene (full
   resolution)* → Run workflow:
   - `entity_id`: one or more candidate IDs, comma-separated — the first
     digitized one wins
   - `dataset`: `declassii` for DZB…, `declassiii` for D3C…, `declassi`
     (or as harvested, e.g. `corona2`) for DS…
   - `max_zoom`: 18 is safe — the pipeline self-caps at the film's real
     resolution
   - leave the rest default.
   The run downloads the original (GB-scale), stitches the scanner passes
   (content-measured overlaps), georeferences from the registry or archive
   corners, cuts the pyramid, uploads to R2, updates both registry files,
   and triggers a site deploy. Watch it under Actions; a red ✗ has full
   logs explaining itself.
3. **Align it** (the archive's first-pass position is always a few km off) —
   next runbook.

## 7. Runbook: fix a scene's alignment

1. Open `…/align.html` on the site. Pick the scene. Set opacity ~60%.
2. Press **✋ Move**, drag the old image until a large landmark (river bend,
   lake, runway) sits on its modern self. Fine-tune with **Rotate °** and
   **Scale %** (typeable). Zoom in and press **🔍 Sharpen here** for full
   film detail under the current view. **◧ Compare** gives a swipe divider
   for judging. **⇋ Mirror** flips the image — needed when an asymmetric
   landmark curves the wrong way (some scans arrive mirrored). Verify at
   TWO landmarks far apart before accepting.
3. Press **⚙ Apply permanently (admin)**. First use asks for a GitHub
   fine-grained access token with **Actions: Read and write** on this
   repository (create under GitHub → Settings → Developer settings). The
   token stays in that browser only. The pipeline then re-cuts the scene
   with your correction (1–2 h) and records it in the calibration registry
   forever. Without a token, press **Copy alignment code** and hand the
   code to a maintainer instead.

## 8. Runbook: credentials

All four secrets live ONLY in GitHub → repository Settings → Secrets and
variables → Actions:

| Secret | What it is | Where to get/rotate |
|---|---|---|
| `USGS_M2M_USERNAME` | USGS account e-mail | ers.cr.usgs.gov |
| `USGS_M2M_TOKEN` | USGS M2M application token | ers.cr.usgs.gov → Application Tokens (account needs the approved M2M "downloader" role) |
| `R2_ACCOUNT_ID` | Cloudflare account ID | Cloudflare dashboard, right sidebar |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token pair (Object Read & Write) | Cloudflare → R2 → API tokens → **Create Account API token** |

One-time bucket setting that the pipeline CANNOT do for you: the bucket's
**CORS policy** (browsers refuse to draw map tiles from a bucket without
it, so the site silently shows no film). An Object Read & Write token may
not change bucket settings, so set it once by hand: Cloudflare → R2 →
`syria-tiles` → Settings → CORS policy →

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

This grants read-only browser access to already-public files; it never
needs touching again.

Rotation = create the new credential at the provider, overwrite the GitHub
secret, delete the old credential. Nothing in the repository changes.
Rotate immediately if a value was ever pasted into a chat, e-mail, or
screenshot. The `secret-scan` workflow (gitleaks) blocks accidental commits
of anything credential-shaped.

The GitHub Pages site itself needs no credentials — a build with all
secrets absent still produces a fully working public site (keyless public
APIs only).

## 9. Costs and limits

- **GitHub**: free (public repository: unlimited Actions minutes, Pages
  hosting, 6 h/job runtime limit — the tile job budget is set to 5.5 h).
- **Cloudflare R2**: 10 GB storage free, then ~$0.015/GB·month; **egress is
  free** (visitors' tile traffic costs nothing). A full-resolution KH-7
  frame ≈ 2–4 GB; seven cities ≈ $0.15–0.30/month.
- **USGS M2M**: free; the archive is public domain. Occasional 503
  maintenance windows — just re-run later.
- **Esri/Wayback, Sentinel, Landsat, Maxar Open Data, Nominatim, titiler.xyz,
  wsrv.nl**: free public services under their respective terms (attribution
  shown in-app; Maxar is non-commercial — the site must stay free).

## 10. Imagery providers reference

| Provider (id) | Years | Georeferencing | Source of truth |
|---|---|---|---|
| USGS declass (`usgs-declass`) | 1960–1984 | none on film → our pipeline + registry | `public/catalog/declass-syria.json` (closed archive, harvested once); M2M credentials are workflow-only, never in the browser |
| Landsat (`landsat`) | 1982– | native | Planetary Computer STAC (`landsat-c2-l2`), queried live |
| Sentinel-2 (`sentinel2`) | 2015– | native | Earth Search STAC, queried live |
| Esri Wayback (`esri-wayback`) | 2014– | native | waybackconfig.json, queried live (grows by itself) |
| Maxar Open Data (`maxar-open`) | events (2023 quake) | native | `public/catalog/maxar-syria.json`, refresh via harvest workflow |
| Earth Engine (`earth-engine`) | prepared stub | — | auth-gated, inactive |

Adding a new provider = implement the `ImageryProvider` interface
(`src/types`), register it in `src/providers/index.ts`, add endpoints to
`src/config/providers.config.ts`. No other file needs to know it exists.
