#!/usr/bin/env python3
"""Measure how adjacent film-scan segments overlap.

Declass film frames ship as 2-4 scanner passes with a shared margin.
Butting them edge-to-edge duplicates the seam area and mis-stacks the
strips vertically. This script estimates, for each adjacent pair, the
translation that makes the shared content coincide, via FFT phase
correlation on downsampled edge strips.

Usage:  segment-offsets.py <axis x|y> <seg1.tif> <seg2.tif> [...]
Output: one line per segment: "<xOff> <yOff>" (integer pixels, first is 0 0)
Falls back to naive butt-joint offsets if correlation is implausible.
"""

import sys
import numpy as np
from osgeo import gdal

gdal.UseExceptions()

axis = sys.argv[1]
files = sys.argv[2:]
# Read at reduced resolution: correlation is robust at ~1/8 scale and fast.
SCALE = 8
# Fraction of each segment edge assumed to contain the shared margin.
EDGE_FRACTION = 0.25


def read_scaled(path):
    ds = gdal.Open(path)
    w, h = ds.RasterXSize, ds.RasterYSize
    band = ds.GetRasterBand(1)
    arr = band.ReadAsArray(0, 0, w, h, w // SCALE, h // SCALE).astype(np.float32)
    return arr, w, h


def phase_correlate(a, b):
    """Return (dy, dx) shift of b relative to a, by phase correlation."""
    h = min(a.shape[0], b.shape[0])
    w = min(a.shape[1], b.shape[1])
    a = a[:h, :w] - a[:h, :w].mean()
    b = b[:h, :w] - b[:h, :w].mean()
    win_y = np.hanning(h)[:, None]
    win_x = np.hanning(w)[None, :]
    fa = np.fft.rfft2(a * win_y * win_x)
    fb = np.fft.rfft2(b * win_y * win_x)
    cross = fa * np.conj(fb)
    cross /= np.abs(cross) + 1e-9
    corr = np.fft.irfft2(cross, s=(h, w))
    peak = np.unravel_index(np.argmax(corr), corr.shape)
    dy, dx = peak
    if dy > h // 2:
        dy -= h
    if dx > w // 2:
        dx -= w
    strength = float(corr.max())
    return dy, dx, strength


segments = [read_scaled(f) for f in files]
offsets = [(0, 0)]

for i in range(1, len(segments)):
    prev, pw, ph = segments[i - 1]
    curr, cw, ch = segments[i]
    if axis == "x":
        edge = max(8, int(prev.shape[1] * EDGE_FRACTION))
        a = prev[:, -edge:]
        b = curr[:, :edge]
    else:
        edge = max(8, int(prev.shape[0] * EDGE_FRACTION))
        a = prev[-edge:, :]
        b = curr[:edge, :]
    dy, dx, strength = phase_correlate(a, b)
    px, py = offsets[i - 1]
    if axis == "x":
        # b's left edge content matches a's right edge shifted by (dy,dx):
        # overlap = edge - dx  (dx>0 means b starts dx into a's edge window)
        overlap = (edge - dx) * SCALE
        naive_x = px + pw
        x = px + pw - overlap
        y = py + dy * SCALE
        # Reject implausible results (no overlap should exceed 40% of width).
        if strength < 0.05 or not (0 <= overlap <= 0.4 * pw) or abs(dy * SCALE) > 0.1 * ph:
            print(f"pair {i}: weak/implausible (strength={strength:.3f}, "
                  f"overlap={overlap}, dy={dy * SCALE}) — butt joint",
                  file=sys.stderr)
            x, y = naive_x, py
    else:
        overlap = (edge - dy) * SCALE
        naive_y = py + ph
        y = py + ph - overlap
        x = px + dx * SCALE
        if strength < 0.05 or not (0 <= overlap <= 0.4 * ph) or abs(dx * SCALE) > 0.1 * pw:
            print(f"pair {i}: weak/implausible (strength={strength:.3f}, "
                  f"overlap={overlap}, dx={dx * SCALE}) — butt joint",
                  file=sys.stderr)
            x, y = px, naive_y
    print(f"pair {i}: strength={strength:.3f} offset=({x},{y})", file=sys.stderr)
    offsets.append((int(x), int(y)))

for x, y in offsets:
    print(x, y)
