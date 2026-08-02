# Candidate imagery and heritage-data sources

Research registry. First compiled 2026-08-02; verified and expanded the
same day by a 12-agent research workflow (8 skeptical fact-checkers, one
per entry; 4 expansion researchers on separate lenses; ~217 web
searches). Each claim below carries the checker's verdict.

Provenance discipline: `confirmed` = an agent read it on the primary or
official source; `corroborated` = 2+ independent secondary sources
agree; `contradicted` = the original claim was wrong and is corrected
here; `unverifiable` = could not be checked from this environment.
Many primary sites return 403 to the Claude sandbox proxy (uark.edu,
cnes.fr, ncap.org.uk, loc.gov, nakala.fr, utexas.edu…) — that is an
environment artifact, never evidence about the source. Final first-hand
confirmation (exact license text at download time, actual scene lists)
must be done by a human or a workflow before integration relies on an
entry.

Scope decision (Ahmad, 2026-08-02): for now the project pursues
GEOGRAPHICAL data only — georeferenced or georeferenceable imagery and
maps. Ground-level photo collections are recorded but deferred.

---

# Part 0 — Processing queue

The sources below, sorted into processing categories. Work top to
bottom within each category. `status` values: `todo`, `in-progress`,
`blocked`, `done` — update the field as work happens so this table is
always the live state.

## Category 1 — Already georeferenced: ingest directly

| # | Source | Era | Resolution | License | Next action | Status |
|---|--------|-----|-----------|---------|-------------|--------|
| 1.1 | CORONA Atlas (A/1) | 1967–1972 | 1.8–2.7 m | CC BY-SA 4.0 footer vs "non-commercial" prose — email CAST | Pull Hama frame via WMTS, compare against our hand-aligned KH-7 reference; then per-city GeoTIFFs | todo |
| 1.2 | Copernicus DEM GLO-30 (B11) | current | 30 m terrain | open, attribution | Hillshade layer under film scenes | todo |
| 1.3 | HOT OSM Syria extracts (B12) | current | vector | ODbL | Arabic place names for UI; reference vectors | todo |
| 1.4 | UNOSAT damage vectors (B9) | 2013–2023 | building-level vector | free w/ attribution | Download per-city sets from HDX; hold for timeline UI | todo |
| 1.5 | EAMENA Zenodo GeoJSON (A/4) | current | site points | CC BY 4.0 | Fetch published Syria datasets only (no coordinate re-publishing beyond them) | todo |

## Category 2 — Easy alignment: scanned maps with printed grids

| # | Source | Era | Scale | License | Next action | Status |
|---|--------|-----|-------|---------|-------------|--------|
| 2.1 | AMS K922 Damascus + Aleppo city plans (B2) | 1958 | 1:10,000 | public domain | Locate LOC item URLs (browser needed), download, georeference by grid | todo |
| 2.2 | Levant 1:50,000 Mandate series (B3) | 1927–1945 | 1:50,000 | pre-1946 French military; check per-item | Inspect Nakala datasets + LOC holdings; list sheets covering our cities | todo |
| 2.3 | AMS K502 sheets at ANU (B4) | 1950s | 1:250,000 | out of copyright | Download Syria sheets from ANU repository | todo |
| 2.4 | AMS K521/K421 at UT Austin (B4) | 1941–42 | 1:200k/1:500k | public domain | Download from PCL pages | todo |
| 2.5 | Gallica Mandate-era maps (B5) | 1930s | small/medium | BnF non-commercial | Pull via IIIF as context layers | todo |

## Category 3 — Standard film pipeline: scan/stitch/align by eye

| # | Source | Era | Resolution | License | Next action | Status |
|---|--------|-----|-----------|---------|-------------|--------|
| 3.1 | KH-9 panoramic, Declass-3 (B1) | 1971–1984 | sub-metre? VERIFY | public domain | EarthExplorer: check Damascus/Aleppo coverage + real GSD BEFORE any KH-7 scan order | todo |
| 3.2 | U-2 frames (A/6) | 1958–1960 | ~0.5 m | public domain | Download Hammer & Ur index, intersect with city list, cost a NARA scan order; study Brown u2egypt code | todo |
| 3.3 | SPOT SWH scenes (A/2) | 1986–2015 | 2.5–20 m | Etalab 2.0 (verify at download) | Register, inventory Syria via OpenSearch API; prefer waiting for ortho L2 | todo |
| 3.4 | NCAP Project ROBIN + Syria holdings (B6) | 1956 | aerial | NCAP/HES, paid scans | Browse Syria page, get scan quote for coastal cities | todo |

## Category 4 — Blocked or watch

| # | Source | Blocker | Status |
|---|--------|---------|--------|
| 4.1 | SPOT ortho Level 2 (Magellium) | not yet released for our area — watch | blocked |
| 4.2 | Soviet Genshtab topo maps (B8) | unresolved copyright — reference only, no re-hosting | blocked |
| 4.3 | Luftwaffe GX over Syria (B7) | existence for Syria unproven — needs NARA RG 373 finding-aid check | blocked |
| 4.4 | UNESCO WHS data (B13) | restrictive terms — use OSM/Wikidata coordinates instead, or request permission | blocked |
| 4.5 | Bavarian WWI Damascus frames (A/8) | needs archive enquiry via foundation | blocked |

## Category 5 — Context only (oblique/ground; deferred by scope decision)

BnF Armée du Levant aerials, Poidebard/USJ, Ifpo MédiHAL obliques,
Syrian Heritage Archive, APAAME Syria slides. Revisit when per-site
context pages are built.

## Category 6 — Closed (verified negatives, Part C)

KH-5/KH-6, Hunting Syria, IGN Remonter le temps, OpenAerialMap Syria,
Soviet film imagery brokers.

---

# Part A — Original entries, now verified

## 1. CORONA Atlas of the Middle East — University of Arkansas CAST
Reliability: mostly-solid. Syria is the Atlas's best-covered country.

- Corroborated: orthorectified, georeferenced CORONA imagery; free
  per-scene GeoTIFF (Web Mercator) or NITF downloads; Syria essentially
  complete, multiple dates per area (missions 1042, 1101–1105, 1107,
  1110, 1116). Entry points https://corona.cast.uark.edu/ and
  https://cast.uark.edu/capabilities/corona.php are live.
- Corrections found:
  - Dates are 1967–1972 only (KH-4A/KH-4B) — no early-1960s frames in
    the orthorectified Middle East set.
  - Resolution class: KH-4B ≈ 1.8 m, KH-4A ≈ 2.7 m GSD — between our
    KH-7 (building) and KH-9 (block) classes.
  - Positional accuracy is uneven: ~3–10 m near frame nadir degrading
    to ~20–80 m at panoramic frame edges (orthorectified with 3rd-order
    rational polynomials, 23–51 GCPs/segment, RMSE 1.64–3.73 px);
    adjacent scenes may not co-register. Treat as "approximate
    alignment" class until hand-verified. Never present as
    measurement-grade.
  - License tension: site footer says CC BY-SA 4.0, CAST prose says
    "non-commercial use"; underlying CORONA film is US-government
    public domain (USGS EROS). Re-hosting derived tiles with CAST/USGS
    attribution appears permissible for this project, but email CAST
    for explicit confirmation before re-hosting.
  - Service note: the Atlas exposes WMTS/WMS (reliable) and a WFS
    footprints service (chronically offline). A maintained QGIS plugin
    (github.com/ishibaro/CAST-corona-clicker) documents working
    endpoints and caches a ~12 MB index of all imagery — a ready recipe
    for scripted access.
- Evidence: Casana & Cothren (Springer,
  https://link.springer.com/chapter/10.1007/978-1-4614-6074-9_4),
  published Atlas review (researchgate.net/publication/236617671),
  Casana et al. 2020 (tandfonline.com/doi/full/10.1080/00934690.2020.1713285).
- Bonus: the Atlas team catalogs 10,000+ archaeological sites
  identified on the imagery.

## 2. SPOT World Heritage archive — CNES (France)
Reliability: mostly-solid. Likely the densest FREE post-1986 archive
for Syria (>17 million scenes worldwide, 1986–2015, 60×60 km each).

- Corroborated: CNES SPOT World Heritage programme; catalogue at
  https://regards.cnes.fr/user/swh (info at regards.cnes.fr/html/swh/).
- Corrections found:
  - License is BETTER than first recorded: since June 2021 the whole
    1986–2015 archive is downloadable by any registered user under the
    French Etalab 2.0 Licence Ouverte (open, attribution required,
    even commercial reuse permitted). The old "non-commercial, 5+ years
    old" framing was the original 2014 terms, now superseded — but some
    SWH pages still carry old wording, so capture the license text
    shown at download time.
  - Resolution honesty: 2.5 m applies only to SPOT 5 (2002–2015)
    THR/Supermode panchromatic. SPOT 1–4 (1986–2002) are 10 m pan /
    20 m multispectral. So pre-2002 Syria imagery is 10–20 m class.
  - Products are Level 1A (NOT orthorectified); CNES/Magellium are
    producing orthorectified SWH Level 2 — watch
    https://earthobservation.magellium.com/project/spot-world-heritage-l2/
  - The catalogue has OpenSearch APIs (automated harvest feasible,
    like our USGS M2M harvesters). CNES's newer unified portal GEODES
    (geodes.cnes.fr, live Jan 2025) also lists Spot data.
- Unverified: exact per-city Syria scene counts (portal 403 from
  sandbox) — inventory via the portal/API from outside.

## 3. Syrian Heritage Archive (SHAP) — Museum für Islamische Kunst + DAI Berlin
Reliability: mostly-solid. DEFERRED (mostly ground photos), with a
geographic exception worth keeping in view.

- Confirmed: started 2013 by MIK + DAI; ~150,000 items open without
  registration. Item counts are moving targets: 300,000+ received per
  current official pages (~350,000 reported in processing) — date any
  figure you cite.
- Corrections found: the public portal is https://syrian-heritage.org/
  (the /shap/ path is the project-description page). The scholarly
  database is in DAI's iDAI.world: iDAI.objects/Arachne project
  "syrher" (https://arachne.dainst.org/project/syrher), iDAI.gazetteer
  (4,000+ georeferenced Syrian places), iDAI.geoserver (plans/maps).
  "Stunde Null" is the broader ArcHerNet initiative (~2016); the
  MIK–DAI Aleppo project ran 2019–2020. Aleppo focus since 2017 is
  correct.
- Geographic exception (in scope): the site hosts an Interactive
  Heritage Map of Syria; iDAI.geoserver holds cartographic material;
  the Aleppo work combined historical/current cadastral maps with
  satellite and aerial imagery — georeferenced Aleppo urban-fabric
  data exists in this sphere even if not yet published as open rasters.

## 4. EAMENA — Endangered Archaeology in the Middle East and North Africa
Reliability: solid. In scope as a heritage-sites overlay, with an
ethical caveat.

- Confirmed: Arches platform; established 2015; Arcadia-funded; entry
  https://eamena.org/database (the application itself is
  https://database.eamena.org).
- Corrections found:
  - Scale understated: now ~338,000–370,000 records across exactly 20
    countries (record counts mix heritage places, grid squares, and
    condition assessments).
  - "Open access" is tiered: even the public tier requires
    registration and deliberately WITHHOLDS coordinates, map zoom, and
    condition data; full access requires a vetted Researcher
    application. This gating is an anti-looting measure.
  - License is CC BY 4.0 — compatible with this project. The safe,
    already-cleared overlay path is their published GeoJSON datasets
    with DOIs on Zenodo (community "eamena"; citation generator at
    database.eamena.org/citations/; tooling at
    github.com/eamena-project/eamena-data).
  - Ethical rule for us: do NOT republish precise coordinates of
    endangered Syrian sites beyond what EAMENA itself has published —
    the license permits it, the mission argues against it.
  - Directly relevant dataset: the EAMENA Aleppo Database — first
    comprehensive satellite-based damage assessment of the Ancient
    City of Aleppo WHS (state as of Dec 2016).

## 5. APAAME aerial photographic archive
Reliability: mostly-solid. Effectively OUT of scope for Syria imagery —
corrected downward.

- Corrections found: APAAME has never flown aerial reconnaissance over
  Syria at all (flying: Jordan annually since 1997, Oman 2018+, Saudi
  al-Ula). Its Syria holdings are David Kennedy's 1970s GROUND-LEVEL
  slides ("Slides of Syria"), historical-collection items, and Google
  Earth-based research (e.g. the Homs "Big Circle"). Photo count now
  ~184,000 on Flickr (~187,000 incl. maps per apaame.org). No blanket
  CC license confirmed — assume rights reserved, permission-by-request
  (even academic use may carry an admin fee).
- Keep only as: a deferred ground-photo lead, and holder of the 1953
  Hunting Aerial Survey of JORDAN diapositives (~4,000, not online).

## 6. Declassified U-2 aerial photography (1958–1960)
Reliability: mostly-solid — and one claim CONTRADICTED in our favor.
This upgrade makes U-2 far more actionable than first recorded.

- Confirmed: declassified 1997; Syria coverage incl. Hama + adjacent
  airfield (deliberate targets) and Aleppo; film at NARA (request from
  Federal Records Center, Lenexa KS; view at NARA II College Park —
  which provides aerial film scanners on site, not just camera
  copying); researchers Emily Hammer & Jason Ur; Penn Museum exhibit.
- CONTRADICTED: "no spatial index exists." Since 2019 a complete open
  index exists: Hammer & Ur, "Spatial Index of U2 Aerial Photography
  of the Middle East, 1958–1960", Harvard Dataverse,
  DOI 10.7910/DVN/VD74QX — shapefiles of flight paths, frame
  footprints, per-mission guides for all 11 NARA-held Middle East
  missions (~46,000 main-camera frames + ~8,100 tracking frames).
  We can determine exactly which frames cover each Syrian city BEFORE
  anyone touches film.
- Syria specifics: Mission B8648 (Oct 1959) transited
  Aleppo → Hama → Homs → Palmyra → Deir ez-Zor → Qamishli — most of
  our target cities in one pass. High-resolution frames reach ~0.5 m
  GSD: genuinely building-class, sharper than KH-7, a decade earlier.
- A working template exists: Brown University's u2egypt.brown.edu
  digitized the 1959 Egypt mission with a public map interface and
  downloadable frames; code at github.com/Brown-University-Library/u2.
  US-government imagery is public domain. UChicago's CAMEL lab began a
  U-2 digitization program in fall 2024.
- Mission framing: "digitize the U-2 Syria flights" is now a concrete,
  costable project (index → frame list → NARA scan order), not an
  archival expedition.

## 7. French Mandate aerial photography (Poidebard) and the Ifpo collection
Reliability: mostly-solid, with corrections.

- Corrections found:
  - "La Trace de Rome dans le désert de Syrie" was published 1934 (not
    1933), Paris: Geuthner; the atlas contains 161 numbered plates
    (the "219 photographs" figure is not supported). Flights: 1925–1932
    with the French Levant air forces; 116+ Roman forts/roads recorded;
    canonical "before" imagery for Palmyra and desert sites.
  - The Poidebard archive is NOT at the Louvre: it is at the
    Bibliothèque Orientale, Université Saint-Joseph (USJ), Beirut
    (~250,000 photographic documents overall; 20,000-photo digitization
    project; portal photos.usj.edu.lb; virtual Poidebard exhibition).
  - Access mechanics are NOT unclear (better than recorded): Ifpo's
    photothèque is openly published on MédiHAL (open CNRS archive,
    Dublin Core metadata, documented open API), 12,000+ of 50,000+
    images online, funded by UNESCO/ALIPH; also an Ifpo Flickr stream
    and images on Wikimedia Commons with governorate captions — the
    easiest licensed ingestion path.
- Confirmed: Ifpo holds 50,000+ images of Syria and Lebanon since the
  early 20th century, aerial and ground. Caveat: most ANALOG originals
  sit in the Damascus premises, inaccessible since 2011.
- Character: almost entirely oblique archaeological photography, not
  systematic vertical mapping — per-site "then" layer, not a base map.

## 8. WWI German aerial photography — Bavarian Fliegerabteilung 304
Reliability: mostly-solid. Confirmed marginal for Syria — with one
concrete exception.

- Refined facts: 2,872 surviving plates (~2,450–2,500 aerial + ~400
  ground), Sept/Nov 1917 – Sept 1918, Yildirim Army Group; held by the
  Bayerisches Hauptstaatsarchiv Abt. IV (Kriegsarchiv), digitized with
  the Bavarian surveying agency (LDBV) and Survey of Israel.
  Georeferenced KML footprints exist (2015 cooperation).
- Syria exception: at least one aerial photo of central Damascus is
  confirmed ("Damaskus, Großes Derwisch-Kloster (Luftbild)" — the
  Takiyya as-Sulaymaniyya — republished by the Syrian Heritage
  Archive); the Sept–Oct 1918 retreat corridor (Rayak, Damascus, Homs,
  Hama, Aleppo) may hold more incidental frames.
- Portals: GDA Findmitteldatenbank Findbuch
  https://www.gda.bayern.de/service/findmitteldatenbank/Findbuch/5836ffaa-7171-4296-8fcf-b5885c7ef04f
  (also mirrored on Archivportal-D / Deutsche Digitale Bibliothek).

---

# Part B — New finds from the expansion research (geographic, in scope)

## B1. KH-9 HEXAGON panoramic-camera imagery — USGS Declass-3  [HIGH]
The 2011 declassification tranche (~670,000+ scenes at USGS EROS,
digitized copies flowing into EarthExplorer since 2015/2020) includes
the KH-9 PANORAMIC camera — reported sub-metre-class GSD, i.e.
potentially building-class, with later capture dates than KH-7.
IMPORTANT CONFLICT TO RESOLVE: this contradicts our working assumption
that "KH-9 ≈ 6 m, can never be building class" — that figure applies to
the mapping camera (our current DZB12xx/D3C scenes). If Declass-3
panoramic frames over Damascus/Aleppo exist and are digitized, they may
be an alternative to ordering KH-7 scans. Verify GSD and Syria coverage
on EarthExplorer (dataset "Declassified Satellite Imagery - 3") before
changing any plan. Public domain.
Evidence: usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-3;
researchgate.net/publication/308684304.

## B2. US Army Map Service K922 city plans: Damascus & Aleppo 1:10,000 (1958)  [MEDIUM]
Street-level city plans of Damascus and Aleppo, Edition 2-AMS (1958),
compiled from British "Town Plans of Syria and Lebanon" (1951). Exactly
the pre-expansion era of our film; US government works = public domain;
scans at the Library of Congress (downloadable TIFF/JPEG2000). LOC 403s
from the sandbox — pull item URLs from a browser:
loc.gov/maps/ (contributor: United States. Army Map Service, location: Syria).

## B3. French Mandate "Levant 1:50,000" topographic series (1927–1945)  [MEDIUM]
The core Mandate-era topographic series of Syria/Lebanon, 80+ sheets
(Bureau Topographique des Troupes du Levant). Highest-value historical
MAP layer for our cities. Digitized sheets at the Library of Congress
(contributor "France. Armée. Troupes françaises du Levant") and —
possibly the easiest bulk source — two scanned datasets on Nakala, the
CNRS repository: https://nakala.fr/10.34847/nkl.ccadlmu2 and
https://nakala.fr/10.34847/nkl.ac8b9ar8 (sheet lists and licenses
unverified: 403 from sandbox; inspect from a browser).

## B4. AMS small/medium-scale series, openly scanned  [HIGH for access]
- Series K502 1:250,000 (1950s): individually scanned, out-of-copyright
  Syria sheets in the ANU Open Research Repository (open, no login,
  full-res downloads) — confirmed sheets incl. El Bab NJ 37-14 (1958),
  Soueida.  https://openresearch-repository.anu.edu.au (search "Syria K502")
- Series K521 Syria 1:200,000 (1941+) and K421 Levant 1:500,000 (1942):
  Perry-Castañeda Library, UT Austin —
  maps.lib.utexas.edu/maps/ams/syria_200k/ (public domain).

## B5. BnF Gallica: Armée du Levant aerial photos + Mandate maps  [HIGH]
The Bibliothèque nationale de France has digitized French-Mandate
MILITARY AERIAL photography of Syria: curated set "Armée du Levant :
Photos aériennes de Syrie et Liban" on the Patrimoines Partagés portal
(https://heritage.bnf.fr/bibliothequesorient/armee-levant-photos-aeriennes-syrie-et-liban)
plus albums on Gallica (e.g. ark:/12148/btv1b8443060c). Earliest usable
aerial layer for Damascus/Aleppo/Hama/Homs (late 1920s–30s; obliques,
"historical context" class). Gallica also holds Mandate-era maps (e.g.
ark:/12148/btv1b531728670, Dubertret geological maps). Free
non-commercial reuse with attribution per BnF conditions; high-res via
IIIF.

## B6. NCAP — National Collection of Aerial Photography, Edinburgh  [HIGH]
~30 million images, 103 countries, with an explicit Syria browse page:
https://ncap.org.uk/browse/countries/syria — confirmed Syria content
includes the declassified UK "Project ROBIN" 1956 high-altitude sorties
(Baniyas confirmed). Volume unknown (403 from sandbox). Free browse at
screen resolution; high-res scans are PAID on-demand digitisation; NCAP/
HES license (not open). Search tool: airphotofinder.ncap.org.

## B7. Luftwaffe WWII "GX" reconnaissance (NARA RG 373 + NCAP)  [MEDIUM, unproven]
1.2M+ captured German frames at NARA ("German Flown Aerial Photography
1939–1945", RG 373); "Middle East 1941–44" coverage confirmed in
general, Luftwaffe operated over Syria in 1941 (Vichy period, Aleppo
staging) — but no source examined names Damascus/Aleppo sorties.
Public domain once copied; free self-service scanning on site.
archives.gov/research/cartographic/aerial-photography/foreign-photography

## B8. Soviet General Staff (Genshtab) topographic maps of Syria  [MEDIUM]
Complete Soviet military topo coverage: 1:200,000 full-country
(1970s–80s; long considered the best complete map cover of Syria) and
1:100,000 (~148 sheets, 1963–1991). Matches our film eras; rich contour/
hydrology/name detail. PROBLEM: copyright genuinely unresolved (never
formally released). Commercial licensed source: East View
(geospatial.com/country_profiles/syria). Free viewers exist
(geamap.com/en/soviet) but with no clean license for re-hosting. Record,
use for reference, do not re-host without legal clarity.

## B9. UNOSAT/UNITAR damage assessments on HDX  [HIGH]
Building-level and damage-density vector layers for exactly our cities
(Homs, Aleppo, Hama, Deir ez-Zor, Raqqa, Daraa, Idlib, Damascus…),
derived from VHR satellite imagery, free on the Humanitarian Data
Exchange (data.humdata.org; org "UNOSAT"). Shapefile/geodatabase.
Pairs naturally with a then/now timeline. (Check per-dataset licenses —
generally free with attribution.)

## B10. Copernicus EMS activation EMSN096 — Syria urban damage & reconstruction  [MEDIUM]
Building-by-building damage assessment (T0) and reconstruction
monitoring (T0–T1) for Syrian urban areas (EU Delegation / UN-Habitat
request). Free with attribution to Copernicus EMS.
mapping.emergency.copernicus.eu/activations/EMSN096/

## B11. Copernicus DEM GLO-30  [HIGH]
Global 30 m DSM, full Syria coverage, free incl. commercial use with
ESA/Airbus attribution; cloud-optimized GeoTIFFs on AWS Open Data
(registry.opendata.aws/copernicus-dem/) and OpenTopography. Use for
terrain-context hillshade under historical film.

## B12. HOT OpenStreetMap Syria exports on HDX  [HIGH]
Country-wide OSM extracts, GIS-ready and regularly refreshed: buildings
(~1.2 M), roads (~173k km), waterways, POIs — incl. Arabic place names
(useful for the Arabic UI work). ODbL 1.0 (attribution + share-alike on
derived DATABASES). data.humdata.org/dataset/hotosm_syr_buildings etc.

## B13. UNESCO World Heritage sites of Syria — LICENSE CAUTION  [HIGH relevance, restrictive terms]
Syria's 6 WHS (Damascus, Bosra, Palmyra, Aleppo, Crac des Chevaliers &
Qal'at Salah El-Din, Ancient Villages of Northern Syria — all "in
danger") are obvious map anchors, BUT whc.unesco.org's own terms
require prior written authorization for republication and its
XML/RSS/KML syndication needs subscription/permission. Do not scrape;
either request permission or source coordinates from open datasets
(OSM/Wikidata) instead.

---

# Part C — Verified negatives (do not re-chase these)

- KH-5 ARGON (~140 m GSD) and KH-6 LANYARD (tiny footprint): in
  Declass-1 on EarthExplorer, but useless for our purposes.
- Hunting Aerosurveys: the famous 1953 survey was JORDAN, not Syria.
  No evidence of Hunting Syria flights; only leads would be UK National
  Archives file C11439429 and industry-successor records.
- IGN "Remonter le temps" (remonterletemps.ign.fr): metropolitan France
  and DOM only — no Levant. Only a written enquiry to IGN's photothèque
  (Saint-Mandé) could uncover unindexed overseas missions.
- OpenAerialMap: all CC-BY but Syria content effectively unverified/
  thin; contribution-driven, don't count on it.
- Soviet film imagery (Zenit/Resurs-F/KVR-1000 "SPIN-2"): conceptually
  rich (2 m class, 1980s), practically non-actionable today — no public
  footprint catalog, quote-based via a Russian commercial broker
  (sanctions risk). Recorded so future sessions don't re-chase.
- APAAME as a Syria AERIAL source: negative (see entry 5).

---

# Part D — Updated sequencing (supersedes the earlier list)

1. CORONA Atlas: evaluate Syrian city frames via their WMTS (reliable)
   and the QGIS-plugin-documented endpoints; email CAST about
   re-hosting terms. Adds a ~1.8–2.7 m 1967–72 timeline layer.
2. USGS EarthExplorer "Declassified Satellite Imagery - 3": resolve the
   KH-9 panoramic-camera question (B1) for Damascus/Aleppo before
   committing to KH-7 scan orders.
3. U-2: download the Hammer & Ur spatial index (Harvard Dataverse,
   DOI 10.7910/DVN/VD74QX), intersect with our city list, produce the
   exact frame list for a NARA scan order. Study the Brown u2egypt
   pipeline as the template.
4. SPOT/CNES SWH: register, inventory Syria scenes via OpenSearch API,
   capture the license text shown at download (expect Etalab 2.0).
5. Maps quick wins (all public domain or open): AMS K922 Damascus/
   Aleppo 1:10,000 city plans (LOC), K502 sheets (ANU), K521/K421
   (UT Austin PCL), Gallica Mandate maps.
6. BnF Armée du Levant aerial set + Ifpo MédiHAL: harvest the digitized
   Syrian aerial obliques (open APIs on both).
7. NCAP Syria: browse holdings, get a quote for Project ROBIN 1956
   scans of coastal cities.
8. Context layers when the UI is ready: UNOSAT damage vectors,
   Copernicus DEM hillshade, HOT OSM (Arabic names).
9. Institutional outreach via the foundation: CAST, CNES, NCAP/HES,
   USJ Beirut (Poidebard), Ifpo, Bavarian Kriegsarchiv (Damascus WWI
   frames), IGN photothèque enquiry.
