# Historical Syria Explorer

An open-source web platform for exploring the satellite imagery record of Syria, from declassified reconnaissance film of the 1960s to current high-resolution imagery.

Live application: https://triavision-ai.github.io/historical-syria-explorer/

## Purpose

This project was made for Syrians. Cities and landscapes have changed profoundly over the past decades, and much of that history exists only in scattered archives that are difficult for the public to reach. Historical Syria Explorer gathers the publicly available imagery record into one place, so that anyone -- residents, families in the diaspora, researchers, journalists, teachers, and reconstruction planners -- can see how a street, a neighbourhood, or a whole city has changed.

The application is free to use, requires no account or registration, and works on any modern phone or computer.

This is an educational, non-commercial project under active development. It is at an early stage: parts of it work well, parts are incomplete, and it will take time to mature. Feedback and contributions are welcome.

## Support

This project is supported by the [German-Syrian Research Foundation](https://ds-fg.com) ([GitHub](https://github.com/German-Syrian-Research-Foundation)). The application remains free, open source, and non-commercial.

## What it does today

- Explore like a map: pan and zoom anywhere in Syria, or search for a city, town, or village in Arabic or English, or by coordinates.
- A per-place timeline shows the real capture dates of the imagery that actually covers the current view; selecting a date loads that image. Empty stretches are shown as gaps rather than filled with a different date.
- Compare any two dates with a swipe divider, or blend a historical image over the modern map with an opacity control.
- Every scene shows its full metadata: mission, capture date, resolution, footprint, license, and a link to the original archive record.

### Imagery sources

| Source                                                          | Period                     | Resolution | Access                                                                                                                                              |
| --------------------------------------------------------------- | -------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| USGS declassified reconnaissance film (CORONA, GAMBIT, HEXAGON) | 1960-1984                  | 0.6-9 m    | 8,564 scenes over Syria indexed; selected frames processed to full resolution (see below)                                                           |
| Landsat (USGS/NASA)                                             | 1972-present               | 30-60 m    | Full archive, searched live                                                                                                                         |
| Sentinel-2 (ESA Copernicus)                                     | 2015-present               | 10 m       | Full archive, searched live                                                                                                                         |
| Esri World Imagery Wayback                                      | 2014-present               | varies     | Map-publication snapshots for all of Syria; the label is the release date, not necessarily the local capture date, and local detail varies by place |
| Maxar Open Data Program                                         | around the 2023 earthquake | ~0.4 m     | 1,422 scenes over northwest Syria                                                                                                                   |

All sources are official and publicly licensed under their respective terms. The application does not scrape imagery or use Google historical imagery. The interface shows imagery only by default; an optional place-name layer (Esri reference tiles, used under the same terms as the basemap) can be switched on to identify cities, towns, and villages. It does rely on some external public services (the OpenStreetMap Nominatim geocoder, a tile-rendering proxy for some modern layers); these are used within their published terms.

### Full-resolution historical film

For selected cities, the original declassified film scans (2-3 GB per frame) are downloaded from the USGS archive, georeferenced, and rendered as map tiles. The tiles are stored in Cloudflare R2 (the repository holds the application, catalogs, manifests, and calibration records). Tiles use lossless PNG encoding, but georeferencing reprojects and resamples the scan, so the tiled output is not pixel-identical to the original film. Processed so far: Hama (1966, hand-aligned reference), and Aleppo, Latakia, Idlib, Deir ez-Zor, Homs+Damascus, and Raqqa (1973-75, first-pass alignment pending by-eye correction). Publication and alignment status are tracked per scene in `public/catalog/registry.json`; only Hama currently supports building-level comparison (see `docs/DATA_PIPELINE.md` §5).

Any of the 8,564 indexed frames can be processed the same way by running a single workflow, subject to hosting space. Frames that USGS has not yet digitized require a one-time scan request through EarthExplorer.

## Known limitations

Honesty about the current state matters more than marketing:

- Georeferencing of historical film is approximate. Frames are aligned automatically from archive corner coordinates; an offset of tens to hundreds of meters is normal, and individual frames can require manual correction. Precise alignment is an ongoing, scene-by-scene effort.
- Sharp imagery before 2011 is scarce. The free record between 1984 and 2013 is Landsat at 30 m resolution, which shows neighbourhoods but not buildings. High-resolution pre-war imagery exists only in commercial archives and may be added in the future if licensing is arranged.
- Maxar high-resolution coverage is limited to the 2023 earthquake response area in the northwest.
- Wayback snapshot dates are mosaic release dates; the underlying photography of a specific place may be somewhat older.
- Full-resolution rendering of Sentinel-2 and Maxar scenes uses a public demonstration tile server and can be slow on first load.
- The interface is currently in English. An Arabic interface is planned.
- Very cloudy scenes appear in search results; the cloud percentage is shown for each scene.

## Operator documentation

Everything needed to run, maintain, and extend this project without its
original authors — the tile store structure and its z/x/y numbering, how to
decode scene identifiers, the registry files, and step-by-step runbooks for
publishing and aligning new historical scenes — is documented in
[docs/HANDBOOK.md](docs/HANDBOOK.md).

## Architecture

The application is a static site (Vite, React, TypeScript, MapLibre GL JS, Tailwind CSS) with no backend of its own. Every imagery source is implemented as a plugin behind a single interface, and all external endpoints are configurable.

```
src/
  components/       User interface (map, timeline, search, scene panels, compare)
  pages/            Page composition
  providers/        Imagery source plugins
    registry.ts       Provider registry (dependency injection)
    stac/             Generic STAC API client and provider base
    landsat/          Landsat via the USGS LandsatLook STAC API
    sentinel/         Sentinel-2 via Earth Search on AWS
    usgs/             Declassified film: catalog, M2M client, local tiles
    wayback/          Esri World Imagery Wayback snapshots
    maxar/            Maxar Open Data Program
    earthEngine/      Google Earth Engine (prepared, not yet active)
  services/         Search fan-out and geocoding; the future AI tool surface
  hooks/            Application state
  types/            Unified data model (ImageScene, ImageryProvider)
  utils/            Shared helpers
  config/           Application constants and all external endpoints
scripts/            Catalog harvesting and film processing pipeline
.github/workflows/  Deployment and data pipelines
public/catalog/     Static scene catalogs (declassified film, Maxar)
public/tiles/       Full-resolution tiles for processed film frames
```

Every provider implements the same contract -- search, load, metadata, capabilities, status -- and returns the same scene model. Adding a new source (for example Planet, Airbus, or OpenAerialMap) means implementing one class and registering it in one line; nothing else changes. A provider that is unconfigured or unreachable degrades to an explanatory status instead of breaking the application.

### Data pipelines

Three GitHub Actions workflows maintain the data, all runnable from the Actions tab:

- Harvest USGS declassified catalog: indexes every declassified frame over Syria through the USGS M2M API (requires the repository secrets USGS_M2M_USERNAME and USGS_M2M_TOKEN; the archive is closed, so this rarely needs re-running).
- Harvest Maxar Open Data catalog: indexes Maxar Open Data scenes over Syria (public data, no credentials).
- Tile a declassified scene: downloads the original film scan for one frame, mosaics its segments, georeferences it, cuts XYZ tiles, and publishes them. Inputs: candidate entity ids, dataset, maximum zoom, and an optional manual corner-order override for frames whose automatic orientation detection needs correction.

Credentials are used only inside these workflows. The published site is fully static and never handles secrets.

## Running locally

Requires Node.js 22 or later and pnpm.

```
git clone https://github.com/Triavision-ai/historical-syria-explorer.git
cd historical-syria-explorer
pnpm install
pnpm dev
```

Additional commands: `pnpm build` (production build), `pnpm test` (unit tests), `pnpm lint`, `pnpm format`. Optional environment variables are documented in `.env.example`; the application is fully functional without any of them.

## Deployment

Every push to `main` builds and deploys the site to GitHub Pages through `.github/workflows/deploy.yml`. The Vite `base` path in `vite.config.ts` must match the repository name.

## Roadmap

1. Viewer with multi-source search, timeline, and comparison -- done.
2. Full-resolution processing of declassified film for major cities -- in progress.
3. Scene-by-scene georeferencing refinement with manual control points.
4. Arabic interface.
5. Google Earth Engine integration.
6. Natural-language search through an AI service layer ("show Al-Kilani quarter before 2011").
7. Automatic change detection between epochs.
8. Dedicated tile hosting as the collection outgrows repository storage.

## Contributing

Contributions are welcome: new providers, georeferencing corrections, Arabic translation, curated scene selections, and testing from inside Syria are all valuable.

1. Fork the repository and create a feature branch.
2. Ensure `pnpm lint`, `pnpm test`, and `pnpm build` pass.
3. New providers must implement the `ImageryProvider` interface, return the unified scene model, and degrade gracefully when unconfigured.
4. Open a pull request with a clear description.

If something cannot legally be implemented, implement the architecture, document the limitation, and continue; the project never depends on any single source.

## License and data policy

- Application code: MIT License.
- Landsat and declassified imagery: United States public domain.
- Sentinel-2: Copernicus data, free to use with attribution.
- Esri World Imagery and Wayback: used under Esri's terms with attribution.
- Maxar Open Data: Creative Commons BY-NC 4.0, non-commercial with attribution.

The project never embeds imagery it has no right to redistribute. Attributions are displayed in the application.

## Acknowledgements

This project stands on public archives and open infrastructure maintained by the U.S. Geological Survey, NASA, the European Space Agency and the Copernicus programme, Esri, Maxar, Element 84, Development Seed, OpenStreetMap contributors, and the SpaceFromSpace project, whose hand-georeferenced work demonstrated what the declassified record can show.
