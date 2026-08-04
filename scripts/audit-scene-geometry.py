#!/usr/bin/env python3
"""Audit the geometry of every tiled scene (docs/SCENES.md audit section).

For each entry in public/tiles/corners.json: measure the quad's side
lengths and diagonals, flag quads that cannot be a camera frame
(opposite sides or diagonals disagreeing), and test whether the scene's
target place falls inside it. Offline and read-only - no network, no
credentials, nothing written.

Usage: python3 scripts/audit-scene-geometry.py
"""

import json
import math
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
TOLERANCE = 0.05  # 5% mismatch between opposite sides / diagonals is a flag

# Which place each tiled scene is published for.
TARGETS = {
    "DZB00402700090H020001": "hama",
    "DZB1206-500074L008001": "aleppo",
    "DZB1206-500016L011001": "latakia",
    "DZB1205-500082L008001": "deir-ez-zor",
    "DZB1210-500023L001001": "idlib",
    "DZB1210-500184L001001": "homs",
    "D3C1209-400566A011": "raqqa",
}


def load(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


def km(a, b):
    """Great-circle-ish distance in km for the short spans involved here."""
    kx = 111320 * math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * 111320) / 1000


def inside(point, quad):
    """Ray-casting point-in-quad test, corners taken in nw,ne,se,sw order."""
    poly = [quad["nw"], quad["ne"], quad["se"], quad["sw"]]
    x, y = point
    hit = False
    for i in range(4):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % 4]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) / (y2 - y1) * (x2 - x1):
            hit = not hit
    return hit


def main():
    corners = load("public/tiles/corners.json")
    places = {p["id"]: (p["lon"], p["lat"]) for p in load("public/catalog/places.json")["places"]}
    problems = 0
    for entity, entry in corners.items():
        q = entry["corners"]
        north, south = km(q["nw"], q["ne"]), km(q["sw"], q["se"])
        west, east = km(q["nw"], q["sw"]), km(q["ne"], q["se"])
        diag1, diag2 = km(q["nw"], q["se"]), km(q["ne"], q["sw"])
        flags = []
        if abs(north - south) / max(north, south) > TOLERANCE:
            flags.append("N/S sides disagree")
        if abs(west - east) / max(west, east) > TOLERANCE:
            flags.append("W/E sides disagree")
        if abs(diag1 - diag2) / max(diag1, diag2) > TOLERANCE:
            flags.append("diagonals disagree")
        target = TARGETS.get(entity)
        if target and target in places and not inside(places[target], q):
            flags.append(f"{target} OUTSIDE the footprint")
        print(
            f"{entity:22s} N{north:7.1f} S{south:7.1f} W{west:7.1f} E{east:7.1f} "
            f"diag {diag1:7.1f}/{diag2:7.1f}  " + ("; ".join(flags) if flags else "ok")
        )
        problems += bool(flags)
    print(f"\n{problems} scene(s) flagged of {len(corners)}.")


if __name__ == "__main__":
    main()
