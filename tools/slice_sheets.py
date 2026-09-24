#!/usr/bin/env python3
"""Slice the source sprite sheets in art/source into individual game sprites.

Usage:  python3 tools/slice_sheets.py [--preview]

Reads tools/sheets.json, cuts every sheet into named sprites using its alpha channel,
trims, scales and writes them as WebP into web/assets/sprites/, then records their sizes in
web/assets/sprites/manifest.json (the game reads sizes from there).

Swapping art later:
  * Replace a sheet in art/source/ with a new one using the same layout and rerun this tool, or
  * overwrite a single file in web/assets/sprites/ (any size; rerun with --manifest-only to
    refresh the recorded sizes).
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'web', 'assets', 'sprites')
CONFIG = os.path.join(ROOT, 'tools', 'sheets.json')
ALPHA_T = 16          # alpha above this counts as "part of a sprite"
MIN_AREA = 1500       # ignore specks smaller than this (in source pixels)
PAD = 4               # transparent padding kept around each trimmed sprite (source px)


def clean_rgba(img):
    """Zero the RGB of fully transparent pixels (the sheets carry colour bleed there)."""
    a = np.array(img)
    a[a[..., 3] == 0, :3] = 0
    return Image.fromarray(a, 'RGBA')


def components(alpha, dilate):
    mask = alpha > ALPHA_T
    merged = ndi.binary_dilation(mask, iterations=dilate) if dilate else mask
    lab, n = ndi.label(merged, structure=np.ones((3, 3)))
    objs = ndi.find_objects(lab)
    areas = ndi.sum(mask, lab, range(1, n + 1))
    comps = []
    for i, sl in enumerate(objs):
        if areas[i] < MIN_AREA:
            continue
        ys, xs = sl
        comps.append({
            'label': i + 1,
            'box': (xs.start, ys.start, xs.stop, ys.stop),
            'cx': (xs.start + xs.stop) / 2,
            'cy': (ys.start + ys.stop) / 2,
        })
    return lab, comps


def order_rows(comps, rows):
    """Assign components to the configured rows (top to bottom), left to right."""
    counts = [len(r) for r in rows]
    if sum(counts) != len(comps):
        raise SystemExit('expected %d sprites, found %d' % (sum(counts), len(comps)))
    comps = sorted(comps, key=lambda c: c['cy'])
    out, i = [], 0
    for r, cnt in zip(rows, counts):
        group = sorted(comps[i:i + cnt], key=lambda c: c['cx'])
        out.extend(zip(r, group))
        i += cnt
    return out


def valley(profile, center, radius):
    lo, hi = max(0, int(center - radius)), min(len(profile), int(center + radius))
    seg = profile[lo:hi]
    return lo + int(np.argmin(seg))


def grid_cells(alpha, rows, cols):
    h, w = alpha.shape
    colp = (alpha > ALPHA_T).sum(axis=0).astype(float)
    rowp = (alpha > ALPHA_T).sum(axis=1).astype(float)
    xs = [0] + [valley(colp, w * k / cols, w / cols * 0.18) for k in range(1, cols)] + [w]
    ys = [0] + [valley(rowp, h * k / rows, h / rows * 0.18) for k in range(1, rows)] + [h]
    cells = []
    for r in range(rows):
        for c in range(cols):
            cells.append((xs[c], ys[r], xs[c + 1], ys[r + 1]))
    return cells


def trim_box(alpha, box):
    x0, y0, x1, y1 = box
    sub = alpha[y0:y1, x0:x1] > ALPHA_T
    ys, xs = np.nonzero(sub)
    if len(xs) == 0:
        return box
    return (max(0, x0 + xs.min() - PAD), max(0, y0 + ys.min() - PAD),
            min(alpha.shape[1], x0 + xs.max() + 1 + PAD), min(alpha.shape[0], y0 + ys.max() + 1 + PAD))


def save_sprite(img, name, scale, manifest, sheet):
    w, h = img.size
    tw, th = max(1, round(w * scale)), max(1, round(h * scale))
    if (tw, th) != (w, h):
        img = img.resize((tw, th), Image.LANCZOS)
    img = clean_rgba(img)
    path = os.path.join(OUT, name + '.webp')
    img.save(path, 'WEBP', quality=90, method=4, alpha_quality=100)
    manifest[name] = {'w': tw, 'h': th, 'sheet': sheet}
    return img


def slice_all(preview=False):
    cfg = json.load(open(CONFIG))
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    previews = []
    for sheet in cfg['sheets']:
        src = Image.open(os.path.join(SRC, sheet['file'])).convert('RGBA')
        arr = np.array(src)
        alpha = arr[..., 3]
        names = [n for row in sheet['rows'] for n in row]
        prefix = sheet.get('prefix', '')
        if sheet['mode'] == 'components':
            lab, comps = components(alpha, sheet.get('dilate', 6))
            for name, comp in order_rows(comps, sheet['rows']):
                x0, y0, x1, y1 = comp['box']
                x0, y0 = max(0, x0 - PAD), max(0, y0 - PAD)
                x1, y1 = min(src.width, x1 + PAD), min(src.height, y1 + PAD)
                crop = arr[y0:y1, x0:x1].copy()
                # keep only pixels that belong to this component (neighbours may poke in)
                own = lab[y0:y1, x0:x1] == comp['label']
                own = ndi.binary_dilation(own, iterations=2)
                crop[~own] = 0
                img = save_sprite(Image.fromarray(crop, 'RGBA'), prefix + name, sheet['scale'], manifest, sheet['file'])
                previews.append((prefix + name, img))
        else:
            cells = grid_cells(alpha, sheet['gridRows'], sheet['gridCols'])
            for name, cell in zip(names, cells):
                x0, y0, x1, y1 = trim_box(alpha, cell)
                crop = arr[y0:y1, x0:x1].copy()
                # blank anything outside the grid cell
                cx0, cy0, cx1, cy1 = cell
                m = np.zeros(crop.shape[:2], bool)
                m[max(0, cy0 - y0):cy1 - y0, max(0, cx0 - x0):cx1 - x0] = True
                crop[~m] = 0
                img = save_sprite(Image.fromarray(crop, 'RGBA'), prefix + name, sheet['scale'], manifest, sheet['file'])
                previews.append((prefix + name, img))
        print('%-22s -> %d sprites' % (sheet['file'], len(names)))

    extra = os.path.join(ROOT, 'tools', 'derived_sprites.py')
    if os.path.exists(extra):
        import importlib.util
        spec = importlib.util.spec_from_file_location('derived', extra)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.build(OUT, manifest)

    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
    print('manifest: %d sprites' % len(manifest))
    if preview:
        contact_sheet(previews)


def refresh_manifest():
    manifest = {}
    for fn in sorted(os.listdir(OUT)):
        if fn.endswith('.webp') or fn.endswith('.png'):
            im = Image.open(os.path.join(OUT, fn))
            manifest[os.path.splitext(fn)[0]] = {'w': im.width, 'h': im.height}
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    print('manifest refreshed: %d sprites' % len(manifest))


def contact_sheet(previews):
    from PIL import ImageDraw
    cell = 220
    cols = 10
    rows = (len(previews) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 18)), (110, 140, 110))
    d = ImageDraw.Draw(sheet)
    for i, (name, img) in enumerate(previews):
        t = img.copy()
        t.thumbnail((cell - 10, cell - 10))
        x, y = (i % cols) * cell, (i // cols) * (cell + 18)
        sheet.paste(t, (x + (cell - t.width) // 2, y + (cell - t.height) // 2), t)
        d.text((x + 4, y + cell + 2), name[:34], fill=(0, 0, 0))
    out = os.path.join(ROOT, 'tools', '.cache')
    os.makedirs(out, exist_ok=True)
    sheet.save(os.path.join(out, 'contact_sheet.jpg'), quality=80)
    print('contact sheet ->', os.path.join(out, 'contact_sheet.jpg'))


if __name__ == '__main__':
    if '--manifest-only' in sys.argv:
        refresh_manifest()
    else:
        slice_all(preview='--preview' in sys.argv)
