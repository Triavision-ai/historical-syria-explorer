# Candidate imagery and heritage-data sources

Research notes from 2026-08-02: additional sources of historical imagery
and heritage data for Syria, beyond the providers already integrated
(USGS declass, Landsat, Sentinel-2, Esri Wayback, Maxar Open Data).

Provenance discipline: every entry lists its evidence and an explicit
verification status. "Corroborated" means multiple independent secondary
sources agree; it is NOT the same as having confirmed the primary site
first-hand. The Claude sandbox cannot reach most external hosts, so
primary-site confirmation (exact license text, actual Syria coverage,
download mechanics) MUST be done by a human or a workflow before any
integration work relies on an entry. Update the status field when that
happens.

Statuses: `corroborated` (multiple independent secondary sources),
`single-source` (one source only — treat as a lead, not a fact),
`confirmed` (a project member verified the primary source first-hand —
record who/when).

---

## 1. CORONA Atlas of the Middle East — University of Arkansas CAST

- What: orthorectified, georeferenced CORONA (1960s) satellite imagery
  of the Middle East, reportedly downloadable free as GeoTIFF (Web
  Mercator) for non-commercial use.
- Why it matters here: pre-aligned 1960s imagery could reduce or bypass
  hand-alignment for CORONA frames; also a methodology reference (their
  orthorectification of panoramic film is published research).
- Entry points: https://corona.cast.uark.edu/ and
  https://cast.uark.edu/capabilities/corona.php
- Evidence: project descriptions in a Springer chapter ("The CORONA
  Atlas Project: Orthorectification of CORONA Satellite Imagery and
  Regional-Scale Archaeological Exploration in the Near East"), a
  published review of the Atlas (Beta), Archaeology Magazine news
  (2013), and multiple archaeology community references.
- Status: corroborated. To confirm on first use: current availability,
  exact terms, Syria frame coverage, whether their georeferencing meets
  our accuracy classes.
- Note: their non-commercial terms align with this project's
  non-commercial mission, but exact license wording must be read before
  redistribution (serving from our R2 is redistribution).

## 2. SPOT World Heritage archive — CNES (France)

- What: the SPOT 1–5 archive (1986–2015, up to 2.5 m panchromatic in
  later years), opened by CNES; imagery at least five years old
  reportedly free for non-commercial users.
- Why it matters here: fills the 1986–2015 gap between the declassified
  film era and the Esri Wayback era (2014+).
- Entry point: https://regards.cnes.fr/html/swh/Home-swh3.html
  (CNES "REGARDS" portal, SPOT World Heritage / SWH programme).
- Evidence: EGU 2020 conference abstract ("SPOT World Heritage
  catalogue: 30 years of SPOT 1-to-5 observation"), Spatial Source news
  article on the archive opening, Apollo Mapping blog. USGS EROS also
  holds a "SPOT Historical" archive but it covers North America only —
  not useful for Syria; use the CNES portal.
- Status: corroborated. To confirm on first use: registration process,
  exact license, actual Syria scene inventory and cloud cover.
- Strategic note: CNES is the precedent to cite when asking other
  European providers (Airbus, ESA) to open Syria coverage.

## 3. Syrian Heritage Archive — Museum für Islamische Kunst + DAI Berlin

- What: open-access digital archive of Syrian cultural heritage;
  reportedly 150,000+ digitized items available without registration
  (of 270,000+ collected), primarily ground photographs from 80+
  collectors; special focus on the Old City of Aleppo (UNESCO site)
  since 2017, including the "Hour Zero" post-conflict documentation
  project.
- Why it matters here: per-site heritage context (photos of monuments
  as they stood) to pair with the aerial views; and both are German
  institutions — natural partners for a German-Syrian foundation.
- Entry points: https://syrian-heritage.org/shap/ and
  https://www.smb.museum/en/museums-institutions/museum-fuer-islamische-kunst/collection-research/research-cooperation/syrian-heritage-initiative/syrian-heritage-archive-project/
- Evidence: Staatliche Museen zu Berlin project pages, a ResearchGate
  paper ("Documentation and Digital Preservation of Syrian Heritage"),
  Culture in Crisis project listing, SPK magazine article.
- Status: corroborated. To confirm on first use: reuse license per item
  (open access to view does not automatically mean free to re-host).

## 4. EAMENA — Endangered Archaeology in the Middle East and North Africa

- What: open-access database (Arches platform) of endangered
  archaeological sites identified from aerial/satellite imagery;
  reportedly 150,000+ site records across 20+ MENA countries including
  Syria. Universities of Oxford, Durham, Leicester; funded by Arcadia
  since 2015.
- Why it matters here: a heritage-sites overlay for the map (where the
  endangered sites are), and proof that Arcadia funds exactly this kind
  of work (grant-application relevance).
- Entry points: https://eamena.org/ and https://eamena.org/database
- Evidence: EAMENA's own project descriptions mirrored on Culture in
  Crisis, an introductory paper ("Endangered Archaeology in the Middle
  East and North Africa: Introducing the EAMENA Project"), PLOS One
  paper using satellite monitoring of Syrian site damage.
- Status: corroborated. To confirm on first use: database API/export
  terms and per-record license for map overlay use.

## 5. APAAME — Aerial Photographic Archive for Archaeology in the Middle East

- What: 180,000+ aerial photographs on open Flickr; founded 1978
  (David Kennedy; now UWA/Oxford). Free for academic use; fees may
  apply for popular-audience reproduction. Coverage is predominantly
  Jordan — Syria coverage is limited.
- Why it matters here: regional reference material; possible individual
  Syria-relevant images.
- Entry points: http://www.apaame.org/ and
  https://www.flickr.com/photos/apaame/
- Evidence: APAAME's own about/usage pages (indexed), Flickr archive,
  AWOL (Ancient World Online) listing.
- Status: corroborated (including the caveat that Syria coverage is
  thin). To confirm on first use: per-image license before any reuse.

## 6. Declassified U-2 aerial photography of Syria (1950s–60s)

- What: U-2 spy-plane photographs declassified in 1997, including
  flights over Syria (Hama and an adjacent airfield, Aleppo are
  specifically reported in the literature). Aerial-photo detail,
  predating KH-7 by nearly a decade.
- The catch (well documented): the archive is NOT digitized and has no
  spatial index. Film must be requested from the Federal Records Center
  (Lenexa, Kansas) and photographed in person at NARA II, College Park,
  Maryland. Not purchasable or downloadable.
- Why it matters here: potentially the earliest high-detail aerial
  record of Syrian cities; digitizing the Syria flights is a natural
  flagship mission for a funded project year.
- Who has done the groundwork: the Penn Museum U-2 aerial archaeology
  exhibit (https://www.penn.museum/on-view/galleries-exhibitions/spy-planes)
  and the Cambridge Advances in Archaeological Practice paper "Near
  Eastern Landscapes and Declassified U2 Aerial Imagery" (Hammer &
  Ur — they built flight-path indexes for the Middle East). Contacting
  these researchers is the first step, not a records request.
- Evidence: Science (AAAS) news article, the Cambridge paper, Penn
  Museum exhibit, NBC News coverage — consistent on all key facts.
- Status: corroborated.

## 7. French Mandate aerial photography (1920s–30s) — Poidebard / IFPO

- What: Antoine Poidebard's pioneering aerial-archaeology flights over
  Syria (219 photos published in "La Trace de Rome dans le désert de
  Syrie", 1933, out of thousands of flight hours), and more broadly the
  IFPO (Institut français du Proche-Orient) photographic collection:
  reportedly 50,000+ images of Syria and Lebanon since the early 20th
  century, held in Beirut and Damascus; related material at the Louvre.
- Why it matters here: imagery of Syrian cities and landscapes 40 years
  before CORONA; French-institution door that a foundation can open.
- Entry points: IFPO (https://www.ifporient.org/), background:
  https://archeologie.culture.gouv.fr/en/antoine-poidebard
- Evidence: History of Photography journal article ("La Trace de
  Rome?"), French Ministry of Culture page on Poidebard, Culture in
  Crisis listing of IFPO's collection, Columbia Global Centers event
  description on Mandate-era archives.
- Status: corroborated for existence and holdings; single-source and
  vague on how much is digitized/accessible — treat access mechanics as
  unknown until IFPO answers.

## 8. WWI German aerial photography (1917–18) — Bavarian State Archives

- What: ~3,000 photos (mostly aerial) by Bavarian Air Force Department
  304, taken Nov 1917 – Sep 1918; digitized in 2005 by the Bavarian
  archives. Coverage is Palestine "from Saida to Gaza" — Syria proper
  is at best marginal.
- Why it matters here: marginal for Syria; kept as a lead because it is
  a digitized German public archive (one inquiry is cheap) and some
  German WWI material on Syria may exist beyond this collection.
- Evidence: Jerusalem Quarterly paper "Mapping Palestine: The Bavarian
  Air Force WWI Aerial Photography", This Week in Palestine archive
  directory, Institute for Palestine Studies holdings directory.
- Status: corroborated, including the negative finding (thin Syria
  coverage).

---

## Suggested sequencing (from the 2026-08-02 discussion)

1. CORONA Atlas: immediate technical win — evaluate their Syria frames
   and terms first.
2. SPOT/CNES: register, inventory Syria scenes; cite as precedent in
   provider outreach.
3. IFPO + Syrian Heritage Archive: institutional outreach via the
   German-Syrian foundation.
4. U-2 Syria flights: flagship digitization mission for a funded
   project year; start by contacting the researchers named above.
