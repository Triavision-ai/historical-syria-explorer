# Data pipeline: the production line for imagery

Status: design agreed 2026-07-23; quality-scoring method decided
2026-08-01 (see section 4). Companion to `docs/HANDBOOK.md`.

## 1. Purpose

The prototype proved the concept. This document defines how the project
treats imagery as managed data: every scene — the seven already published
and every scene that enters in the future — passes through the same
stations, is judged by the same criteria, and carries a permanent record
of what happened to it. No scene reaches visitors by an ad-hoc path.

## 2. The scene registry

`public/catalog/registry.json` is the single lifecycle record: one entry
per scene admitted to the line. The harvested catalogs
(`declass-syria.json`, `maxar-syria.json`) remain the raw inventory of
what exists; the registry records what we did about it.

Each record answers five questions:

| Block        | Question it answers                                              |
| ------------ | ---------------------------------------------------------------- |
| `source`     | Where did it come from — provider, platform, license?            |
| `capture`    | When was it taken, at what nominal resolution?                   |
| `quality`    | How good is it — machine score and human verdict?                |
| `alignment`  | Where does it truly sit — and does a human still need to fix it? |
| `processing` | What did we build from it (tiles, zoom range, storage)?          |

`status` summarizes the record for dashboards and the site:
`cataloged` → `assessed` → `rejected` | `acquired` → `tiled` →
`needs-alignment` → `published`.

Rules, matching the existing registries (handbook §4):

- Registry entries are never deleted. A rejected scene keeps its record
  and its score — that is how the line learns.
- Once the assessment workflow exists, workflows write the registry;
  hand edits only when no run is active. Like the other CI-owned JSON
  files, prettier must not reformat it.
- `quality.humanVerdict` and `alignment.verifiedBy` outrank any machine
  value, permanently. The human eye is the final judge.

## 3. The stations of the line

1. **Harvest** (exists: `harvest-declass.yml`, `harvest-maxar.yml`).
   Source catalogs are refreshed; new frames appear in the raw inventory
   with their source metadata.
2. **Assess** (to build: `assess-scenes.yml`). For each candidate frame,
   download the small browse image and compute a quality score
   (section 4). Write a registry record with `status: assessed`, or
   `rejected` when the frame is unusable (fully clouded, unreadable).
   Borderline frames are queued for a human verdict rather than guessed.
3. **Acquire**. The full-resolution product is downloaded (or ordered
   for scan-on-demand — backlog item 2). `status: acquired`.
4. **Tile** (exists: `tile-declass-scene.yml`). Film to lossless pyramid
   to R2, reading and writing `corners.json` as today. The workflow
   additionally stamps the registry record: `status: tiled`, processing
   block filled.
5. **Align**. Every scene starts at `alignment.method:
"archive-corners"` with `needsHuman: true` — archive corner labels
   lie (rotation, mirroring). A human alignment via `align.html` sets
   `method: "human"`, `needsHuman: false`, and who verified it.
   Until then `status: needs-alignment`.
6. **Publish**. Scene is live and correctly placed: `status: published`.

The `needsHuman` flag makes the human queue explicit: the alignment
backlog is simply every record with `alignment.needsHuman: true`, and
the assessment queue is every record awaiting `humanVerdict`.

## 4. Quality scoring — decided (2026-08-01)

The score must work on panchromatic film browse images (no spectral
bands) and on modern RGB previews, and must be reproducible: every score
is stored with `method` and `assessedAt` so the whole archive can be
re-scored when the method improves.

**Important limit: browse images cannot measure resolution.** The USGS
browse JPEGs are heavily downsampled, so scoring judges _usability_ —
cloud fraction, haze, frame damage, and relative sharpness — never true
ground resolution. Resolution stays a metadata fact (KH-7 ≈ 0.6 m,
KH-9 mapping ≈ 6 m) plus whatever the full-resolution scan delivers at
tiling time.

**Decision: a vision model grades everything, with a cheaper/dearer
tier.** The candidate approaches were classical image statistics (free
but fooled by desert glare/snow/haze), a trained classifier (needs
labeled data we do not have), and a vision-language model. Vision won on
accuracy-per-effort once real prices were checked:

1. **Claude Haiku 4.5 grades every browse image** via the Batch API.
   Cloud/haze/damage/sharpness → a `usable | borderline | junk` verdict.
   Cost for the full 8,564-frame archive is on the order of $9 (Batch
   API halves list prices; nothing here is latency-sensitive).
2. **Claude Sonnet 5 re-judges only Haiku's borderline band** — a small
   fraction, a dollar or two. Disagreements and residual borderlines go
   to the human queue.
3. **Ahmad is the calibration standard.** Before the full run, a
   ~50-frame pilot is graded by Haiku, by Sonnet, and by Ahmad. If Haiku
   agrees with his eye ~90% of the time, tier 1 stands; otherwise the
   bulk pass moves to Sonnet (≈ $17 for the whole archive at intro
   pricing — still less than one scan order).

Every verdict records the exact model id and prompt version in its
`quality.method` (e.g. `haiku-4-5-batch-v1`) plus `assessedAt`, so the
archive is cheaply re-scorable when a better model ships. Never
auto-reject on a single heuristic; a classical statistics pass may still
be added later as a free cross-check, but is not required.

## 5. Comparison classes — what a scene is good enough for

"Comparing buildings" needs both **resolution fine enough to see a
building** and **alignment better than a building's width**. A Syrian
house is ~10–15 m across, so:

| Class            | Requirement                                 | Sees                                        |
| ---------------- | ------------------------------------------- | ------------------------------------------- |
| **building**     | GSD ≤ 1 m AND `alignment.needsHuman: false` | individual houses, courtyards, condition    |
| **block**        | GSD ≤ ~6 m                                  | city blocks, mosques, stadiums, street grid |
| **neighborhood** | GSD ≤ ~10 m                                 | district shape, built-up extent             |
| **city**         | GSD ≤ ~30 m                                 | urban growth over decades                   |

Consequences the registry and UI must respect:

- Today only **Hama (KH-7, 0.6 m, human-verified)** meets the building
  class. The 1973–75 KH-9 cities are **block** class and can never be
  building class no matter how well aligned — that is why sharper KH-7
  frames for Damascus and Aleppo are on the backlog.
- **Alignment gates the class.** A 0.6 m scene that is 2 km off is worse
  than nothing for building comparison — you would compare the wrong
  buildings. A scene is building class only when both resolution and
  human-verified alignment hold.
- **Honesty, not measurement.** Even a perfect pair supports _visual_
  comparison ("this building existed then, it is gone now"), not
  survey/measurement use: film warp can drift positions several metres
  across a frame. The UI labels the class and shows a "not for
  measurement" note; it never implies metric accuracy.

## 6. What "solid data" means here

- Every published pixel is traceable to a source, a license, a capture
  date, and the exact calibration used to place it.
- Every automatic judgment is recorded with its method and date, and can
  be recomputed; every human judgment is recorded with its author and
  outranks the machine.
- A new data source (new mission, new provider) requires no new process
  — only a harvester that feeds the same line.
