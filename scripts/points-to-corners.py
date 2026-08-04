#!/usr/bin/env python3
"""Convert a QGIS Georeferencer .points file into pipeline corner inputs.

Workflow (docs: gcp/README.md): Ahmad georeferences a scan mosaic in
QGIS against Esri World Imagery, saves the control points, and this
script fits an affine transform (least squares), evaluates it at the
mosaic's four pixel corners, and prints the corner_order / corners_json
inputs for tile-declass-scene.yml - plus the fit's residuals in metres,
which is the first real accuracy number any scene gets.

Mirrored scans need no special handling: the fitted affine's negative
determinant expresses the mirror, and the printed corner order carries
it into the pipeline.

Usage:
  python3 scripts/points-to-corners.py <file.points> --size WIDTHxHEIGHT
  python3 scripts/points-to-corners.py <file.points> --raster mosaic.tif

The .points file must be saved against the SAME raster the pipeline
mosaics (use scans/<id>/cog/mosaic.tif from R2, or reproduce its
vertical a,b,c stacking) - otherwise the corners describe a different
image. Points may be in QGIS 3 format (header line '#CRS: ...' then
mapX,mapY,sourceX,sourceY,enable,...) or the older headerless CSV.
Map coordinates must be WGS84 lon/lat (EPSG:4326).
"""

import argparse
import csv
import math
import subprocess
import sys


def read_points(path):
    rows = []
    with open(path, newline="") as f:
        for raw in csv.reader(f):
            if not raw or raw[0].startswith("#"):
                continue
            if raw[0].strip().lower() in ("mapx", "map_x"):
                continue
            try:
                map_x, map_y, src_x, src_y = (float(v) for v in raw[:4])
            except ValueError:
                continue
            enabled = True
            if len(raw) > 4:
                enabled = raw[4].strip() not in ("0", "false", "False")
            if enabled:
                rows.append((map_x, map_y, src_x, src_y))
    if len(rows) < 3:
        sys.exit(f"need at least 3 enabled points, found {len(rows)}")
    return rows


def fit_affine(points):
    """Least-squares fit lon/lat = A @ (col, row, 1); returns two 3-vectors."""
    # QGIS stores source row as a negative Y; normalize to positive rows.
    cols = [p[2] for p in points]
    rows = [-p[3] if p[3] <= 0 else p[3] for p in points]
    ones = [1.0] * len(points)
    def solve(target):
        # Normal equations for a 3-parameter fit (tiny system; no numpy).
        a = [[0.0] * 3 for _ in range(3)]
        b = [0.0] * 3
        basis = (cols, rows, ones)
        for i in range(3):
            for j in range(3):
                a[i][j] = sum(basis[i][k] * basis[j][k] for k in range(len(points)))
            b[i] = sum(basis[i][k] * target[k] for k in range(len(points)))
        # Gaussian elimination.
        for i in range(3):
            pivot = max(range(i, 3), key=lambda r: abs(a[r][i]))
            a[i], a[pivot] = a[pivot], a[i]
            b[i], b[pivot] = b[pivot], b[i]
            for r in range(i + 1, 3):
                factor = a[r][i] / a[i][i]
                for c in range(i, 3):
                    a[r][c] -= factor * a[i][c]
                b[r] -= factor * b[i]
        x = [0.0] * 3
        for i in (2, 1, 0):
            x[i] = (b[i] - sum(a[i][c] * x[c] for c in range(i + 1, 3))) / a[i][i]
        return x
    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    return solve(lons), solve(lats), cols, rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("points")
    parser.add_argument("--size", help="mosaic pixel size as WIDTHxHEIGHT")
    parser.add_argument("--raster", help="read the size from this raster via gdalinfo")
    args = parser.parse_args()

    if args.size:
        width, height = (int(v) for v in args.size.lower().split("x"))
    elif args.raster:
        info = subprocess.run(["gdalinfo", args.raster], capture_output=True, text=True).stdout
        line = next(l for l in info.splitlines() if l.startswith("Size is"))
        width, height = (int(v) for v in line.replace("Size is", "").split(","))
    else:
        sys.exit("pass --size WIDTHxHEIGHT or --raster <file>")

    points = read_points(args.points)
    ax, ay, cols, rows = fit_affine(points)
    predict = lambda c, r: (ax[0] * c + ax[1] * r + ax[2], ay[0] * c + ay[1] * r + ay[2])

    # Residuals in metres - the scene's measured accuracy.
    errs = []
    for (lon, lat, _c, _r), c, r in zip(points, cols, rows):
        plon, plat = predict(c, r)
        kx = 111320 * math.cos(math.radians(lat))
        errs.append(math.hypot((plon - lon) * kx, (plat - lat) * 111320))
    rmse = math.sqrt(sum(e * e for e in errs) / len(errs))
    print(f"points: {len(points)}   RMSE {rmse:.1f} m   worst {max(errs):.1f} m", file=sys.stderr)
    if rmse > 500:
        print("WARNING: fit is poor - check that points were placed on the mosaic "
              "the pipeline uses and that map coords are EPSG:4326", file=sys.stderr)

    # Pixel corners in TL,TR,BR,BL order -> geographic labels.
    pixel_corners = [(0, 0), (width, 0), (width, height), (0, height)]
    lonlats = [predict(c, r) for c, r in pixel_corners]
    by_lat = sorted(range(4), key=lambda i: -lonlats[i][1])
    north, south = by_lat[:2], by_lat[2:]
    labels = {}
    labels[min(north, key=lambda i: lonlats[i][0])] = "nw"
    labels[max(north, key=lambda i: lonlats[i][0])] = "ne"
    labels[min(south, key=lambda i: lonlats[i][0])] = "sw"
    labels[max(south, key=lambda i: lonlats[i][0])] = "se"

    order = ",".join(labels[i] for i in range(4))
    corners = {labels[i]: [round(v, 6) for v in lonlats[i]] for i in range(4)}
    import json
    print("corner_order:", order)
    print("corners_json:", json.dumps(corners, separators=(",", ":")))


if __name__ == "__main__":
    main()
