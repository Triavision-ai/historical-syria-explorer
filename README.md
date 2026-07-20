# Historical Syria Explorer

**An AI-ready, open-source geospatial platform for browsing every publicly available historical satellite image over Syria — from the 1960s until today.**

Type _"Hama Old City"_ and get the oldest available image, the newest, a timeline in between, side-by-side comparison, metadata, and links to the original archive products. Eventually: _"Show Al-Kilani Quarter before 2011"_ or _"Find the oldest image covering Aleppo Citadel"_ — answered automatically across every provider.

Built for reconstruction, heritage preservation, research, agriculture, and environmental analysis.

> This is **not** a GIS viewer and not another Leaflet map. It is a plugin-based imagery platform with a service layer designed to be driven by both humans and AI agents.

---

## Features (Version 1 — Viewer)

- 🛰 **Pure satellite map** — label-free imagery basemap. No street names, no place names, no Google UI.
- 🔎 **Search Syria** — cities, villages, neighbourhoods (Arabic or English) or raw `lat, lon` coordinates, biased to Syria.
- 🕰 **Timeline 1960 → 2026** — tap a year, get the best available scene for the current location.
- 📚 **Multi-provider scene list** — one chronological list merged from every registered provider.
- 🆚 **Compare mode** — swipe divider between the historical scene (left) and current imagery (right), plus an opacity blend slider.
- 📄 **Metadata panel** — mission, capture date, resolution, footprint, license, raw provider metadata, and ordering/download links.
- 📱 **Mobile-first, dark UI** — pinch zoom, bottom-sheet panels, safe-area aware; equally at home on desktop.
- 🏛 **Seed historical data** — the declassified KH-7 GAMBIT scene `DZB00402700090H020001` over Hama (25 April 1966) ships as curated catalog metadata.

## Live imagery sources (no API keys required)

| Provider                                      | Coverage                 | Backend                                                                                       |
| --------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| **Landsat (USGS)**                            | 1972 → today, 30–60 m    | [LandsatLook STAC API](https://landsatlook.usgs.gov/stac-server) — public domain              |
| **Sentinel-2 (Copernicus)**                   | 2015 → today, 10 m       | [Earth Search STAC on AWS](https://earth-search.aws.element84.com/v1) — free with attribution |
| **USGS Declassified** (CORONA/GAMBIT/HEXAGON) | 1960–1984, down to 0.6 m | Curated catalog now; full [M2M API](https://m2m.cr.usgs.gov/) search with a free USGS token   |
| **Google Earth Engine**                       | 1972 → today             | Provider prepared; activates with an OAuth client id (roadmap V3)                             |

---

## Architecture

Everything is plugin-based. Providers, endpoints, cities and years are never hardcoded into components — they live in configuration and registries.

```
src/
├── components/          # Presentational + interactive UI
│   ├── map/             # MapLibre canvas, label-free style, overlay, compare sync
│   ├── search/          # Geocoding search box
│   ├── timeline/        # Bottom year timeline
│   ├── scenes/          # Scene list + metadata panel
│   └── controls/        # Compare toggle, opacity slider
├── pages/               # Page shells (HomePage)
├── providers/           # ⭐ Imagery provider plugins
│   ├── registry.ts      # ProviderRegistry (dependency injection)
│   ├── stac/            # Generic STAC client + generic STAC provider
│   ├── landsat/         # Landsat via LandsatLook STAC (config only)
│   ├── sentinel/        # Sentinel-2 via Earth Search STAC (config only)
│   ├── usgs/            # Declassified imagery: curated catalog + M2M client
│   └── earthEngine/     # Earth Engine provider (auth-gated, V3)
├── services/            # ⭐ Service layer — the future AI tool surface
│   ├── sceneSearchService.ts   # Parallel fan-out across all providers
│   └── geocodingService.ts     # Place/coordinate resolution (Nominatim)
├── hooks/               # Zustand store + React hooks
├── types/               # Unified data model (ImageScene, ImageryProvider, …)
├── utils/               # bbox / date / http helpers
└── config/              # App constants + ALL external endpoints (env-overridable)
```

### The provider contract

Every imagery source implements one interface and registers itself in one place:

```ts
interface ImageryProvider {
  readonly id: string;
  capabilities(): ProviderCapabilities; // what it can do, temporal range, auth needs
  status(): Promise<ProviderStatus>; // ready / unconfigured / error
  search(query: SceneSearchQuery): Promise<ImageScene[]>;
  load(scene: ImageScene): Promise<SceneLayer | null>; // how to draw it on the map
  metadata(sceneId: string): Promise<Record<string, unknown>>;
}
```

Every provider returns the **same data model**:

```ts
interface ImageScene {
  id;
  provider;
  mission;
  captureDate;
  resolution;
  bounds;
  thumbnail;
  downloadUrl;
  previewUrl;
  metadata;
  license;
  geometry;
}
```

Adding Maxar, Planet, Airbus, NASA or OpenAerialMap later means implementing `ImageryProvider` and adding one line to `src/providers/index.ts`. Nothing else changes.

### Design principles

- **Plugin everything** — providers are injected via `ProviderRegistry`; UI only sees the unified model.
- **Graceful degradation** — a failing or unconfigured provider becomes a per-provider outcome, never a broken search. The app never stops because one provider is unavailable.
- **Configuration over code** — every endpoint and credential comes from `src/config/` and Vite env vars (`.env.example`).
- **AI-ready service layer** — `SceneSearchService`, `GeocodingService` and the registry form a typed tool surface that LLM function-calling (Claude, GPT, Gemini) will drive in Version 4: search provider → zoom → timeline → download → compare.
- **Strict quality** — strict TypeScript (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), ESLint, Prettier, Vitest.

---

## Installation

Requires Node 22+ and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/Triavision-ai/historical-syria-explorer.git
cd historical-syria-explorer
pnpm install
pnpm dev            # http://localhost:5173
```

Other scripts:

```bash
pnpm build          # type-check + production build to dist/
pnpm preview        # serve the production build
pnpm test           # vitest unit tests
pnpm lint           # eslint
pnpm format         # prettier
```

### Optional credentials

Copy `.env.example` to `.env.local`. The app is fully functional without credentials; adding them unlocks more archives:

- `VITE_USGS_M2M_USERNAME` / `VITE_USGS_M2M_TOKEN` — live search of the complete USGS declassified archive (free account: [ERS registration](https://ers.cr.usgs.gov/register), token: [app token generator](https://ers.cr.usgs.gov/password/appgenerate)).
- `VITE_EE_CLIENT_ID` — Google Earth Engine OAuth client (V3).
- `VITE_TITILER` — a [TiTiler](https://developmentseed.org/titiler/) instance to render full-resolution Cloud-Optimized GeoTIFFs as map tiles instead of browse previews.

## GitHub Pages deployment

Deployment is automated: `.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`.

One-time setup: repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.

The site is served at `https://triavision-ai.github.io/historical-syria-explorer/` (the Vite `base` in `vite.config.ts` must match this path).

---

## Licensing & data policy

- Application code: **MIT**.
- Landsat & declassified imagery: **US public domain** (USGS).
- Sentinel-2: free to use with **Copernicus attribution**.
- Basemap tiles: Esri World Imagery, used with the required attribution.
- The app **never scrapes websites and never embeds proprietary imagery**. Declassified film scenes (e.g. the 1966 KH-7 Hama scene) are represented by their official metadata with ordering links into USGS EarthExplorer until authorized digital assets or an M2M download pipeline exist — this limitation is by design, not by accident.

## Roadmap

| Version                      | Scope                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **V1 — Viewer** ✅           | Map, search, timeline, scene list, metadata, compare                                                            |
| **V2 — USGS integration**    | Authenticated M2M search + browse/download pipeline for declassified imagery                                    |
| **V3 — Earth Engine**        | OAuth sign-in, Landsat/Sentinel collections rendered server-side                                                |
| **V4 — AI Search**           | Natural-language queries ("Show Al-Kilani Quarter before 2011") via LLM function-calling over the service layer |
| **V5 — Change detection**    | Automatic diffing between epochs                                                                                |
| **V6 — Building extraction** | Historical building footprints from imagery                                                                     |
| **V7 — Time Machine**        | Continuous morphing timeline of any place in Syria                                                              |

## Development

- `src/providers/` is the extension point — see `StacImageryProvider` for how a full provider can be pure configuration.
- State lives in a single Zustand store (`src/hooks/useExplorerStore.ts`); components stay thin.
- The map is MapLibre GL JS with a hand-written raster style — deliberately no third-party style, no labels.
- Keep commits small, one feature per commit.

## Contributing

Contributions are very welcome — providers, translations (Arabic UI), curated declassified catalogs, tiling infrastructure:

1. Fork and create a feature branch.
2. `pnpm lint && pnpm test && pnpm build` must pass.
3. New providers must implement `ImageryProvider`, return the unified `ImageScene` model, and degrade gracefully when unconfigured.
4. Open a pull request with a clear description.

If something cannot legally be implemented (licensing, imagery rights), implement the architecture and document the limitation — never block the rest of the platform.
