# Data pipeline: the production line for imagery

Status: design agreed in principle 2026-07-23; quality-scoring method
pending a decision (see section 4). Companion to `docs/HANDBOOK.md`.

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
| `source`     | Where did this picture come from, under what license?            |
| `capture`    | When was it taken, by what platform, at what resolution?         |
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

## 4. Quality scoring — the open decision

The score must work on panchromatic film browse images (no spectral
bands) and on modern RGB previews, and must be reproducible: every score
is stored with `method` and `assessedAt` so the whole archive can be
re-scored when the method improves. Candidate approaches:

**A. Classical image statistics (no ML).** Python/OpenCV in a GitHub
Action over each browse JPEG: cloud fraction from bright low-texture
area, sharpness from Laplacian variance, plus contrast and coverage of
the frame. Free at any scale (8,564 frames in one run), fully
transparent and tunable, but approximate — snow, desert glare, and haze
can fool it.

**B. Small learned models.** A lightweight cloud/blur classifier over
browse images. More accurate than A once trained, but needs labeled
examples from our own archive first — a human labeling effort that does
not exist yet.

**C. Vision-language model scoring.** Send each browse image to a
multimodal model (e.g. the Claude API) asking for cloud percentage,
sharpness, and usefulness for a city explorer. Closest to a human
judgment and needs no training data, but costs per image, needs an API
key in Actions secrets, and scores are less strictly reproducible.

**Recommendation: A for everything, C for the doubtful band.** Run the
classical pass over the full archive for free; auto-accept the clearly
good, auto-reject the clearly bad, and send only the uncertain middle
(expected to be a small fraction) to a vision model or to the human
queue. Store which method produced each verdict. Revisit B only if the
labeled data accumulated by the human queue makes training worthwhile.

## 5. What "solid data" means here

- Every published pixel is traceable to a source, a license, a capture
  date, and the exact calibration used to place it.
- Every automatic judgment is recorded with its method and date, and can
  be recomputed; every human judgment is recorded with its author and
  outranks the machine.
- A new data source (new mission, new provider) requires no new process
  — only a harvester that feeds the same line.
