#!/usr/bin/env python3
"""Probe the CORONA Atlas (University of Arkansas CAST) for Syria coverage.

Read-only reconnaissance for docs/SOURCES.md queue item 1.1. Fetches the
Atlas's GeoWebCache WMS capabilities, lists every `corona:` layer whose
bounding box covers each Syrian city of interest, and downloads one small
sample GetMap image per city for by-eye inspection. No credentials; the
service is public (attribution: CAST, University of Arkansas).

Endpoints come from the CAST Corona Clicker QGIS plugin (v2.1), which
documents the reliable services (the WFS footprints service is known to
be flaky and is not used here).

Output: probe-output/report.md plus probe-output/<city>.png samples.
Exit code 0 even when coverage is empty - absence of coverage is a valid
result; only transport/parse failures exit non-zero.
"""

import os
import re
import sys

import requests

BASE = "https://geoserve.cast.uark.edu/geoserver"
CAPS_URL = f"{BASE}/gwc/service/wms?REQUEST=GetCapabilities&tiled=true"
UA = {"User-Agent": "historical-syria-explorer-probe/1.0 (open-source heritage project)"}

PLACES_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "catalog", "places.json")


def load_places():
    """Canonical place list -> {id: (lon, lat)}. See public/catalog/places.json."""
    import json

    with open(PLACES_FILE) as f:
        data = json.load(f)
    return {p["id"]: (p["lon"], p["lat"]) for p in data["places"]}

SAMPLE_HALF_DEG = 0.045  # ~5 km half-width sample window
SAMPLE_PX = 1024
PROBE_PX = 256     # tiny existence-check size: cheap enough for many attempts
MAX_CONFIRM = 3    # stop after this many layers proven to hold imagery at the point
MAX_ATTEMPTS = 80  # give up on a place after this many blank/error layers


def fetch_capabilities():
    r = requests.get(CAPS_URL, headers=UA, timeout=120)
    r.raise_for_status()
    return r.text


def parse_layers(caps_text):
    """Return [(layer_name, (minx, miny, maxx, maxy))] for EPSG:4326 corona tilesets.

    Deliberately NOT a strict XML parse: the service's GetCapabilities
    uses namespace prefixes without declaring them (ElementTree raises
    "unbound prefix"), so extract the <TileSet> blocks textually.
    """
    layers = []
    for block in re.findall(r"<TileSet\b.*?</TileSet>", caps_text, flags=re.S):
        name_m = re.search(r"<Layers>\s*(corona:[^<\s]+)\s*</Layers>", block)
        srs_m = re.search(r"<SRS>\s*([^<\s]+)\s*</SRS>", block)
        bb_m = re.search(r"<BoundingBox\b[^>]*>", block)
        if not (name_m and bb_m):
            continue
        if srs_m and srs_m.group(1) != "EPSG:4326":
            continue
        bb_tag = bb_m.group(0)
        attrs = dict(re.findall(r'([A-Za-z]+)="([^"]*)"', bb_tag))
        if attrs.get("SRS", "EPSG:4326") != "EPSG:4326":
            continue
        try:
            bbox = tuple(float(attrs[k]) for k in ("minx", "miny", "maxx", "maxy"))
        except (KeyError, ValueError):
            continue
        layers.append((name_m.group(1), bbox))
    # The same layer is advertised once per format/style: dedupe by name.
    seen, unique = set(), []
    for name, bbox in layers:
        if name not in seen:
            seen.add(name)
            unique.append((name, bbox))
    return unique


def covering(layers, lon, lat):
    hits = [(n, b) for n, b in layers if b[0] <= lon <= b[2] and b[1] <= lat <= b[3]]
    # Smallest bbox first: per-scene layers beat any region-wide mosaics.
    hits.sort(key=lambda item: (item[1][2] - item[1][0]) * (item[1][3] - item[1][1]))
    return hits


def get_map(layer, lon, lat, px=SAMPLE_PX):
    h = SAMPLE_HALF_DEG
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetMap",
        "LAYERS": layer,
        "SRS": "EPSG:4326",
        "BBOX": f"{lon - h},{lat - h},{lon + h},{lat + h}",
        "WIDTH": px,
        "HEIGHT": px,
        "FORMAT": "image/png",
        "TRANSPARENT": "true",
    }
    r = requests.get(f"{BASE}/wms", params=params, headers=UA, timeout=180)
    content_type = r.headers.get("content-type", "")
    if r.ok and content_type.startswith("image/"):
        return r.content, None
    return None, f"HTTP {r.status_code} {content_type}: {r.text[:200]}"


def is_blank(png_bytes):
    """True when the sample holds no imagery (fully transparent or uniform).

    The capabilities bboxes are coarse grid cells, so a layer can 'cover'
    a point while its actual film strip lies elsewhere - the server then
    returns an empty transparent PNG. Decide by pixels, not byte size.
    """
    from io import BytesIO

    from PIL import Image

    img = Image.open(BytesIO(png_bytes)).convert("RGBA")
    alpha_lo, alpha_hi = img.getextrema()[3]
    if alpha_hi == 0:
        return True
    gray = img.convert("L")
    lo, hi = gray.getextrema()
    return lo == hi


def main():
    os.makedirs("probe-output", exist_ok=True)
    report = ["# CORONA Atlas probe report", ""]
    caps = fetch_capabilities()
    with open("probe-output/capabilities.xml", "w") as f:
        f.write(caps)
    layers = parse_layers(caps)
    report.append(f"Total `corona:` EPSG:4326 tile layers advertised: **{len(layers)}**")
    report.append("")
    for city, (lon, lat) in load_places().items():
        hits = covering(layers, lon, lat)
        report.append(f"## {city}  ({lon}, {lat})")
        if not hits:
            report.append("No covering layers (by bbox).")
            report.append("")
            continue
        report.append(f"Candidate layers by bbox: {len(hits)} (coarse grid cells - pixel check decides)")
        confirmed, blanks, errors = [], 0, 0
        for name, _bbox in hits:
            if len(confirmed) >= MAX_CONFIRM or (blanks + errors) >= MAX_ATTEMPTS:
                break
            # Cheap tiny existence check first; the shareable full-size
            # sample is fetched only for the first confirmed layer.
            png, err = get_map(name, lon, lat, px=PROBE_PX)
            if err:
                errors += 1
                continue
            if is_blank(png):
                blanks += 1
                continue
            confirmed.append(name)
            if len(confirmed) == 1:
                full, err = get_map(name, lon, lat)
                with open(f"probe-output/{city}.png", "wb") as f:
                    f.write(full if not err else png)
        for name in confirmed:
            report.append(f"- CONFIRMED imagery at this point: `{name}`")
        report.append(
            f"Checked {len(confirmed) + blanks + errors} layers: "
            f"{len(confirmed)} with imagery, {blanks} blank, {errors} errors."
            + (" Sample saved." if confirmed else " NO imagery found at this point in the first candidates.")
        )
        report.append("")
    with open("probe-output/report.md", "w") as f:
        f.write("\n".join(report))
    print("\n".join(report))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - report any transport/parse failure plainly
        print(f"PROBE FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
