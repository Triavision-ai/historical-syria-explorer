# Tiled scenes: source links and alignment status

Quick reference for alignment sessions: for every scene that has a tile
pyramid, the original USGS scan (browse image), the R2 tile base, and
where its alignment stands. Entity IDs match the align tool's dropdown,
public/tiles/index.json and public/tiles/corners.json.

Browse images are the USGS quicklook of the WHOLE scanned film segment,
which is exactly what the tile pyramid is cut from - open one to see
what a scene really contains before aligning it.

| Entity ID | Area | Date | Mission | Native res | Alignment |
|---|---|---|---|---|---|
| DZB00402700090H020001 | Hama | 1966-04-25 | KH-7 | 0.6 m | human-verified for the Hama panel only - multi-frame scan, see below |
| DZB1206-500074L008001 | Aleppo | 1973-08-01 | KH-9 | 0.6 m | archive corners, pending |
| DZB1206-500016L011001 | Latakia | 1973-07-18 | KH-9 | 0.6 m | archive corners, pending |
| DZB1205-500082L008001 | Deir ez-Zor | 1973-03-28 | KH-9 | 0.6 m | archive corners, pending |
| DZB1210-500023L001001 | Idlib | 1975-06-13 | KH-9 | 0.6 m | archive corners, pending |
| DZB1210-500184L001001 | Homs / Damascus | 1975-07-24 | KH-9 | 0.6 m | archive corners, pending |
| D3C1209-400566A011 | Raqqa | 1975-01-25 | KH-9 mapping | 6 m | archive corners, pending |

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

## Open issue: one scan can hold SEVERAL camera frames

Observed by Ahmad in the align tool (2026-08-03) on
DZB00402700090H020001 - the HAMA KH-7 scene, i.e. the project's
human-verified reference: the scan contains multiple separate exposures
stacked along the film, each with its own black border and USGS frame
annotations (visible numbers ...020, ...033, ...040), and each covering
a DIFFERENT piece of ground.

That the reference scene is itself multi-frame is the important part:
Ahmad's 2026-07-22 hand alignment is valid for the panel he matched
(the one containing Hama) and cannot also be correct for the other
panels in the same scan. Hama-the-city is therefore still trustworthy;
the rest of that scene's footprint is not, and should not be presented
as aligned imagery.

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
