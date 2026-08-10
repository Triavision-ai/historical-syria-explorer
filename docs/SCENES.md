# Tiled scenes: source links and alignment status

Quick reference for alignment sessions: for every scene that has a tile
pyramid, the original USGS scan (browse image), the R2 tile base, and
where its alignment stands. Entity IDs match the align tool's dropdown,
public/tiles/index.json and public/tiles/corners.json.

Browse images are the USGS quicklook of the WHOLE scanned film segment,
which is exactly what the tile pyramid is cut from - open one to see
what a scene really contains before aligning it.

| Entity ID             | Area            | Date       | Mission      | Native res | Alignment                                                            |
| --------------------- | --------------- | ---------- | ------------ | ---------- | -------------------------------------------------------------------- |
| DZB00402700090H020001 | Hama            | 1966-04-25 | KH-7         | 0.6 m      | human-verified for the Hama panel only - multi-frame scan, see below |
| DZB1206-500074L008001 | Aleppo          | 1973-08-01 | KH-9         | 0.6 m      | archive corners, pending                                             |
| DZB1206-500016L011001 | Latakia         | 1973-07-18 | KH-9         | 0.6 m      | archive corners, pending                                             |
| DZB1205-500082L008001 | Deir ez-Zor     | 1973-03-28 | KH-9         | 0.6 m      | archive corners, pending                                             |
| DZB1210-500023L001001 | Idlib           | 1975-06-13 | KH-9         | 0.6 m      | archive corners, pending                                             |
| DZB1210-500184L001001 | Homs / Damascus | 1975-07-24 | KH-9         | 0.6 m      | archive corners, pending                                             |
| D3C1209-400566A011    | Raqqa           | 1975-01-25 | KH-9 mapping | 6 m        | archive corners, pending                                             |

Note: the catalog labels the `declassii` dataset "KH-7 GAMBIT / KH-9
HEXAGON" as a single string; the per-scene mission above follows the
project's own per-frame labelling (DZB004... is the KH-7 Hama frame,
the DZB12xx frames are KH-9).

## Original USGS scans (browse quicklooks)

- Hama 1966: https://ims.cr.usgs.gov/browse/declassii/004027/00090/DZB00402700090H020001-00842.jpg
- Aleppo 1973: https://ims.cr.usgs.gov/browse/declassii/1206-5/00074/DZB1206-500074L008001-00178.jpg
- Latakia 1973: https://ims.cr.usgs.gov/browse/declassii/1206-5/00016/DZB1206-500016L011001-00206.jpg
- Deir ez-Zor 1973: https://ims.cr.usgs.gov/browse/declassii/1205-5/00082/DZB1205-500082L008001-00185.jpg
- Idlib 1975: https://ims.cr.usgs.gov/browse/declassii/1210-5/00023/DZB1210-500023L001001-00023.jpg
- Homs/Damascus 1975: https://ims.cr.usgs.gov/browse/declassii/1210-5/00184/DZB1210-500184L001001-00034.jpg
- Raqqa 1975: https://ims.cr.usgs.gov/browse/declass3/1209-4/00566/A/D3C1209-400566A011.jpg

(If a link 403s in a browser, use the CORS proxy the site already uses:
`https://wsrv.nl/?url=` + the URL without its scheme.)

## Tile pyramids in R2

Base: `https://pub-f8ac6c500eea43b28591b7b636fc9e3d.r2.dev/tiles/<entityId>/{z}/{x}/{y}.png`
e.g. `.../tiles/DZB1205-500082L008001/12/2470/1650.png`

## Geometry audit, 2026-08-03

Every tiled scene checked by measuring its corners.json quad (side
lengths, diagonals) and testing whether its target city falls inside
that quad. Inputs: public/tiles/corners.json and
public/catalog/places.json - reproducible offline, no network.

| Scene                                      | Footprint                          | Shape                                                 | Target city                            |
| ------------------------------------------ | ---------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| DZB00402700090H020001 (Hama, hand-aligned) | 20.5 x 53.0 km                     | near-rectangular, diagonals 57.3 / 57.1               | Hama inside                            |
| DZB1206-500074L008001 (Aleppo)             | 118.6 x 237.2 km                   | exact parallelogram, aspect 0.500                     | Aleppo inside                          |
| DZB1206-500016L011001 (Latakia)            | 117.8 x 235.6 km                   | exact parallelogram, aspect 0.500                     | Latakia inside                         |
| DZB1205-500082L008001 (Deir ez-Zor)        | 115.9 x 232.0 km                   | exact parallelogram, aspect 0.499                     | Deir ez-Zor inside                     |
| DZB1210-500023L001001 (Idlib)              | 119.4 x 239.3 km                   | exact parallelogram, aspect 0.499                     | Idlib OUTSIDE, ~4 km north of the edge |
| DZB1210-500184L001001 (Homs/Damascus)      | 118.9 x 238.2 km                   | exact parallelogram, aspect 0.499                     | Homs OUTSIDE, ~3 km east of the edge   |
| D3C1209-400566A011 (Raqqa)                 | 303 km long, sides 16.8 vs 36.9 km | INVALID: not a parallelogram, diagonals 292.8 / 304.3 | Raqqa OUTSIDE                          |

Findings:

1. D3C1209-400566A011 is malformed. Opposite sides differ by more than
   a factor of two (16.8 vs 36.9 km) and the diagonals differ by 12 km,
   which no camera frame can produce. Its implied 18:1 stretch also
   disagrees with the USGS browse quicklook of the same entity, which
   reads roughly 10:1 - so the imagery is stretched about 1.8x along
   the strip. Hand alignment cannot fix this; the corners must be
   corrected first. (Earlier note in this file called a long thin strip
   implausible for this camera - wrong: the browse confirms the frame
   IS a long strip. The defect is the inconsistent quad, not its
   thinness.)

2. Idlib and Homs fall 3-4 km outside their own footprints. That is the
   systematic archive-corner offset expressed as a number, consistent
   with the film-border effect measured on Hama below.

3. The five KH-9 footprints are suspiciously ideal: perfect
   parallelograms, aspect exactly 0.500, matching diagonals. Real film
   footprints are not that tidy - Hama's measured quad is 0.386. These
   are very likely nominal rectangles supplied by the archive rather
   than measured corners, which is a further reason they sit off the
   ground truth.

Practical consequence: Aleppo, Latakia and Deir ez-Zor have clean
geometry with the target city inside, so by-eye alignment behaves
predictably on them. Raqqa should be left alone until its corners are
rebuilt.

## Open issue: film borders are inside the georeferenced mosaic

Ahmad noticed (2026-08-03) that the Hama scene in the align tool looks
like several stacked panels separated by black bars carrying USGS frame
annotations (numbers ...020, ...033, ...040), while the USGS browse
quicklook of the same entity is one clean continuous image.

Resolved, and NOT multiple locations: USGS ships one frame as several
scan segments (_a.tif, _b.tif, ...) and scripts/prepare-frame.mjs
mosaics them (see its header comment). The panels are consecutive
sections of the SAME exposure. The difference from the browse is that
USGS trims the film edges for its quicklook, while our mosaic keeps the
raw scan including the black film borders and their annotation blocks.

The real problem this exposes: the archive corner coordinates describe
the IMAGE area of the frame, but the mosaic they are pinned to also
contains non-image film border. Mapping the four corners onto the outer
corners of a mosaic that includes borders stretches and shifts the
imagery relative to the ground - a systematic error, and a strong
candidate explanation for the few-kilometre offsets seen on every
archive-corner scene.

Fix direction (not yet implemented): detect and crop the film borders
(dark margins plus annotation blocks, and any inter-segment gaps)
before building the GCP VRT, so the corners pin the image area only.
Test: re-cut one pending scene with cropping and compare its offset
against the current version. If confirmed, this improves every scene
and makes hand alignment start much closer to correct.

Why it matters: the pipeline maps one scan to one set of four corners
and the align tool applies ONE similarity transform to the whole image.
That is only correct for a single continuous frame. Where a scan holds
several frames, aligning one of them necessarily leaves the others
misplaced - and a misplaced panel still renders on the map, which is
exactly the "looks authoritative but is wrong" failure the project
must avoid.

Fix direction (not yet implemented): detect the film borders, split the
scan into individual frames, and tile each frame as its own scene with
its own corners.json entry, so each can be aligned and verified
separately. Until then, treat multi-frame scenes as unverified and
prefer aligning frames whose target city sits in the panel being
matched.
