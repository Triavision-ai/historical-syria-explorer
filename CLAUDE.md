# Claude session notes — Historical Syria Explorer

Read docs/HANDBOOK.md first: it documents the architecture, the tile
store and its z/x/y encoding, scene-ID decoding, the registry files, and
step-by-step runbooks. This file adds only what an AI session needs on
top: hard rules, current state, gotchas learned the expensive way, and
the agreed backlog.

## Mission and hard rules

- Free, open source, made for Syrians, educational, non-commercial.
  Never add logins for visitors, ads, or paid gates.
- NEVER degrade imagery: no lossy intermediates (DEFLATE, not JPEG), no
  downsampling below the film's native resolution, no upsampling beyond it
  (the tile workflow enforces both — keep it that way).
- No hardcoded endpoints (src/config/providers.config.ts only) and no
  credentials in code, git history, or chat. Secrets live exclusively in
  GitHub Actions secrets. gitleaks runs on every push.
- Never scrape or hotlink imagery without a license that permits it.
  Esri/Wayback and Maxar Open Data (CC BY-NC) are used within their terms.
- Small professional commits, no emoji in repo prose, README stays formal.
- The user (Ahmad, ahmad.altahlawi@iproconsult.com, from Homs) works
  mostly FROM A PHONE, dictates voice messages (expect transcription
  noise: "Hammer"=Hama, "coordination"=georeferencing/alignment), and is
  the final judge of alignment quality by eye.
- Cost discipline: delegate routine monitoring/log-reading to small
  (haiku) subagents; the main model is for decisions and code.

## System shape (details in the handbook)

- Static site (Vite/React/TS/MapLibre) on GitHub Pages; no backend.
- Heavy tiles in Cloudflare R2 bucket `syria-tiles`, public dev URL
  pub-f8ac6c500eea43b28591b7b636fc9e3d.r2.dev (ENDPOINTS.tilesBase).
- public/tiles/index.json = which scenes have pyramids (storage r2|repo).
- public/tiles/corners.json = permanent per-scene calibration registry;
  tiling runs read it first and write back what they used. Hand
  alignments live here forever — never discard an entry.
- public/align.html = standalone by-eye alignment tool (move/rotate/
  scale/mirror/compare/sharpen). Its "Apply permanently (admin)" button
  dispatches tile-declass-scene.yml with a GitHub token the admin keeps
  in their own browser (sessionStorage `ghToken`, tab-lifetime only; a
  GitHub App or reviewed-proposal flow is the planned replacement).
- Workflows: tile-declass-scene.yml (film → R2 tiles, the core),
  find-digitized.yml (which frames near a point are downloadable),
  harvest-declass / harvest-maxar (catalogs), deploy.yml, secret-scan.yml.

## State as of 2026-08-05

- German-Syrian Research Foundation partnership DECIDED: the repository
  stays in Triavision-ai (no fork, no transfer for now). The foundation
  (github.com/German-Syrian-Research-Foundation) is credited as
  supporter in the README, the welcome hint, and the permanent map
  attribution line. Revisit a full transfer only if Ahmad gets org
  owner status there; a custom domain first would make that move
  painless (recommended to Ahmad).

## State as of 2026-08-01

- Quality scoring DECIDED (ends the open question in DATA_PIPELINE §4):
  Claude Haiku 4.5 grades every browse image via the Batch API
  (~$9 for the whole 8,564-frame archive); Claude Sonnet 5 re-judges
  only Haiku's borderline band; disagreements and residual borderlines
  go to Ahmad. Every verdict records model id + prompt version in
  registry.json so the archive is cheaply re-scorable. Next concrete
  step: a ~50-frame pilot Ahmad verifies by eye before the full run.
  Note: browse previews are downsampled — scoring judges usability
  (cloud/blur/damage), never true resolution.
- Comparison classes agreed (docs/DATA_PIPELINE.md §5): building-level
  comparison requires GSD <= 1 m AND human-verified alignment (today:
  Hama only). KH-9 (~6 m) is block/neighborhood class and can never be
  building class — that is the justification for ordering KH-7 scans
  for Damascus and Aleppo (backlog). UI should label the class, never
  imply measurement-grade accuracy.
- Damascus finding: it sits at the extreme south edge of frame
  DZB1210-500184L001001 (bounds end at lat 33.49; the city is at
  33.51), so with the current misalignment the film's black border
  covers the city and the "HD" badge misleads. Alignment will help but
  coverage may stay partial — a Damascus-centered frame from the
  catalog (110 scenes there) is the real fix.
- Comparison research (Corona Atlas, Google Earth, Esri Wayback, EO
  Browser, Worldview, OldMapsOnline) validated the per-place real-date
  timeline and produced adopted lessons: stable gray-don't-remove
  timeline, big prev/next controls, per-scene truth popup, public
  swipe compare, one curated scene per city/era as default, never
  silently backfill a different date.

## State as of 2026-07-30

- Full audit (own multi-agent review + an external ChatGPT report)
  fixed on main: workflow input injection closed, client M2M credential
  path removed, search is submit-only (Nominatim policy), align-tool
  token now session-only, compare-map destroy crash, Wayback cache
  poisoning, per-frame KH-7/KH-9 labels, ISO capture dates (Safari),
  static-catalog result caps, STAC bucket sort bias, overlay
  attribution. Open by design: registry-driven publication gating,
  Wayback publication-date modeling, accuracy classes (see the audit
  remediation plan in chat history and docs/DATA_PIPELINE.md).

## State as of 2026-07-23

- Seven cities live at full native resolution from R2:
  Hama 1966 KH-7 z18 (mirrored, hand-aligned by Ahmad — the reference),
  Aleppo/Latakia/Idlib/Deir ez-Zor 1973-75 KH-9 z16,
  Homs+Damascus 1975 KH-9 z15, Raqqa 1975 D3C z15.
- Alignment pending (archive-corner first pass, a few km off):
  DZB1206-500074L008001 (Aleppo), DZB1206-500016L011001 (Latakia),
  DZB1210-500023L001001 (Idlib), DZB1205-500082L008001 (Deir ez-Zor),
  DZB1210-500184L001001 (Homs/Damascus), D3C1209-400566A011 (Raqqa).
  Ahmad aligns via the tool; alignment codes may also arrive in chat —
  convert with the similarity+mirror math (see git history of
  corners.json for the Hama example) and re-run with clean_r2=true.
- SECURITY DEBT: the USGS M2M token and the R2 token were both exposed
  in chat/screenshots on 2026-07-22. Remind Ahmad to rotate both
  (handbook §8) — do not let this linger.

## Gotchas that cost hours — do not relearn them

- Archive corner labels lie: frames can be rotated ~48-118° and MIRRORED.
  Two-point similarity checks cannot detect mirroring; only whole-frame
  human judgment (or asymmetric landmarks) can. Trust Ahmad's eye.
- USGS M2M has maintenance windows (e.g. Tue until 2PM CT) returning 503
  "Application Offline" HTML. Retry later; nothing is wrong locally.
- Parallel tile runs race on the two registry JSONs. The commit step
  regenerates entries on latest main per retry — never revert to
  pull --rebase there.
- R2 bucket CORS had to be set BY HAND in the dashboard (the pipeline
  token can't set bucket config; put-bucket-cors fails silently). Without
  it the site silently shows no film. Already set; documented in §8.
- r2.dev URLs and most external hosts are unreachable from the Claude
  sandbox — verify public reachability via the user or a workflow, not
  curl. GitHub API via MCP tools only (raw.githubusercontent.com works).
- MapLibre tile templates: never percent-encode {z}/{x}/{y} (no new URL()).
- ims.cr.usgs.gov browse images need the wsrv.nl CORS proxy for WebGL.
- public/tiles/*.json are CI-owned: never let prettier reformat them.
- actions_list MCP results overflow context: parse the saved-to-file JSON
  with python via Bash, or send a haiku subagent.
- GitHub Pages + browser caching: hard-refresh before diagnosing "not
  deployed"; align.html/index.html can be ~10 min stale.

## Agreed backlog (user-approved direction)

1. assess-scenes.yml: the quality-scoring station (DATA_PIPELINE §4).
   Haiku 4.5 grades all browse images via Batch API, Sonnet 5 referees
   the borderline band, Ahmad settles disputes. Start with the ~50-frame
   pilot for by-eye verification. Writes registry.json quality blocks.
2. Registry-driven publication + honest badges: split "HD" into
   "Full resolution" (pipeline fact) and "Approximate alignment"
   (orange until human-verified); gate/label on registry status so an
   unaligned scene never shows as authoritative (Damascus screenshot).
3. Timeline/UX from comparison research: gray-don't-remove stable
   timeline, big prev/next, per-scene truth popup (mission, true date,
   native resolution, alignment class), public swipe compare, one
   curated scene per city/era as default.
4. order-scan workflow: try M2M ordering endpoints for scan-on-demand;
   fall back to documented manual EarthExplorer ordering. Order sharper
   KH-7 frames for Damascus and Aleppo (only path to building-level
   comparison there — KH-9 can't reach it). Also find a
   Damascus-centered frame in the catalog.
5. Watch-list cron: weekly find-digitized sweep over a
   public/catalog/watchlist.json; auto-dispatch tiling for newly
   digitized frames.
6. Optional COG per scene in R2 (single downloadable georeferenced file).
7. PWA: manifest + service worker (Add to Home Screen, offline tile
   cache of recently viewed cities) — no app store, keeps the free/URL
   model; ties in with Arabic UI.
8. Arabic UI (RTL, place-name variants).
9. More cities/eras from the 8,564-scene catalog (Tartus, Daraa,
   Qamishli, Palmyra, pre-lake Euphrates valley).
