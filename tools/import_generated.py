#!/usr/bin/env python3
"""Turn a generated image (character on a flat background) into game sprites.

Usage:
  python3 tools/import_generated.py --list
  python3 tools/import_generated.py <request-id> <image.png | https://...> [--out DIR] [--preview]

<request-id> is one of the requests in tools/art_requests.json (--list shows them, with the
prompt to generate and which of its sprites exist already). The tool:
  1. keys out the flat background (flood-filled from the image border, so white inside a
     character, like a shirt, stays); an image that already has a transparent background
     is used as it is,
  2. finds the separate figures and matches them to the request's outputs left to right
     (row by row when the request has "rows": n),
  3. trims each, scales it to the output height (mirrored if the output says "mirror") and
     writes web/assets/sprites/<name>.webp,
  4. records the size in manifest.json, and keeps the original (lossless WebP) in
     art/source/generated/.
Optional request fields:
  "rows": n        the figures are laid out in n rows (top row first, each left to right)
  "merge": px      join detached bits within this distance (a stream of water, crumbs)
  "uniform": {"ref": [sprites], "height": h}
                   scale every output by one factor, chosen so the listed outputs come out
                   h px tall (their median): poses of one character keep a single scale.
                   Outputs then need no "height". The feet anchor of each output (the
                   ax to use in PLAYER_POSES) is printed.
Optional output fields: "mirror": true flips it; "match": "<sprite>" resizes it to exactly the
size of an earlier output of the same request (two versions of one object that swap in place).
Nothing else is needed: characters pick up their portraits and in-world sprites at the next
launch (see web/js/data/characters.js).
"""
import io
import json
import os
import sys
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQ = os.path.join(ROOT, 'tools', 'art_requests.json')
SPRITES = os.path.join(ROOT, 'web', 'assets', 'sprites')
ORIGINALS = os.path.join(ROOT, 'art', 'source', 'generated')

BG_TOL = 34        # colour distance from the background that still counts as background
EDGE = 22          # distance over which the edge fades from transparent to opaque
MIN_FRAC = 0.004   # figures smaller than this fraction of the image are specks
MERGE = 6          # dilation (px) that joins stray bits (hair, a dangling strap) to their figure
PAD = 6


def load_requests():
    with open(REQ, encoding='utf8') as f:
        data = json.load(f)
    return data


def prompt_for(data, req):
    text = req['prompt'].replace('{style}', data['style'])
    for k, v in data['characters'].items():
        text = text.replace('{' + k + '}', v)
    return text


def read_image(src):
    if src.startswith(('http://', 'https://')):
        with urllib.request.urlopen(src, timeout=120) as r:
            raw = r.read()
    else:
        with open(src, 'rb') as f:
            raw = f.read()
    return raw, Image.open(io.BytesIO(raw)).convert('RGBA')


def has_alpha(img):
    a = np.asarray(img)[..., 3]
    return a.min() == 0 and (a < 8).mean() > 0.05


def key_background(img):
    """Alpha-mask everything connected to the border that looks like the background colour."""
    a = np.asarray(img).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    near = (dist < BG_TOL) | (alpha < 8)
    lab, _ = ndi.label(near)
    edge_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    background = np.isin(lab, edge_labels[edge_labels > 0])
    # soft edge: pixels next to the background fade in with their distance from its colour
    ring = ndi.binary_dilation(background, iterations=2) & ~background
    out_a = np.where(background, 0.0, 255.0)
    fade = np.clip((dist - BG_TOL * 0.5) / EDGE, 0, 1) * 255
    out_a = np.where(ring, np.minimum(out_a, fade), out_a)
    out_a = np.minimum(out_a, alpha)
    # take the background colour back out of the semi-transparent edge (no white halo)
    k = np.clip(out_a / 255.0, 1e-3, 1)[..., None]
    fg = np.clip((rgb - bg * (1 - k)) / k, 0, 255)
    rgb = np.where((out_a > 0)[..., None] & (out_a < 255)[..., None], fg, rgb)
    res = np.dstack([rgb, out_a]).astype(np.uint8)
    res[res[..., 3] == 0, :3] = 0
    return Image.fromarray(res, 'RGBA')


def figures(img, merge=MERGE, rows=1):
    alpha = np.asarray(img)[..., 3]
    mask = alpha > 16
    merged = ndi.binary_dilation(mask, iterations=merge)
    lab, n = ndi.label(merged, structure=np.ones((3, 3)))
    areas = ndi.sum(mask, lab, range(1, n + 1))
    min_area = MIN_FRAC * mask.size
    found = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        if areas[i] < min_area:
            continue
        ys, xs = sl
        found.append({'label': i + 1, 'box': (xs.start, ys.start, xs.stop, ys.stop), 'area': areas[i]})
    found.sort(key=lambda f: (f['box'][0] + f['box'][2]) / 2)
    if rows > 1 and len(found) > rows:
        # split into rows at the widest vertical gaps between figure centres
        by_y = sorted(found, key=lambda f: (f['box'][1] + f['box'][3]) / 2)
        cy = [(f['box'][1] + f['box'][3]) / 2 for f in by_y]
        gaps = sorted(range(1, len(cy)), key=lambda i: cy[i - 1] - cy[i])[:rows - 1]
        out, start = [], 0
        for g in sorted(gaps) + [len(by_y)]:
            out += sorted(by_y[start:g], key=lambda f: (f['box'][0] + f['box'][2]) / 2)
            start = g
        found = out
    return lab, found


def crop_figure(img, lab, fig):
    x0, y0, x1, y1 = fig['box']
    a = np.array(img)
    keep = lab[y0:y1, x0:x1] == fig['label']
    crop = a[y0:y1, x0:x1].copy()
    crop[~keep] = 0
    # trim to what is actually visible (the dilated label box is a little generous)
    ys, xs = np.where(crop[..., 3] > 8)
    crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = crop.shape[:2]
    canvas = np.zeros((h + 2 * PAD, w + 2 * PAD, 4), np.uint8)
    canvas[PAD:PAD + h, PAD:PAD + w] = crop
    return Image.fromarray(canvas, 'RGBA')


def cut(img, lab, fig, height=None, scale=None):
    im = crop_figure(img, lab, fig)
    if scale is None:
        scale = height / im.height
    return im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)


def feet_anchor(im):
    """Horizontal anchor (0..1) of what touches the ground: the middle of the lowest 6% of the figure."""
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 16)
    band = xs[ys > ys.max() - (ys.max() - ys.min()) * 0.06]
    return round(float(band.mean()) / im.width, 3)


def main(argv):
    data = load_requests()
    reqs = {r['id']: r for r in data['requests']}
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    if argv[0] == '--list':
        with open(os.path.join(SPRITES, 'manifest.json'), encoding='utf8') as f:
            manifest = json.load(f)
        for r in sorted(data['requests'], key=lambda r: r['priority']):
            have = [o['sprite'] for o in r['outputs'] if o['sprite'] in manifest and not str(manifest[o['sprite']].get('sheet', '')).startswith('derived')]
            print(f"[{r['priority']}] {r['id']}: {len(have)}/{len(r['outputs'])} done  ->  {', '.join(o['sprite'] for o in r['outputs'])}")
            print('    prompt:', prompt_for(data, r))
        return 0
    rid, src = argv[0], argv[1] if len(argv) > 1 else None
    if rid not in reqs or not src:
        print('unknown request or missing image; try --list')
        return 2
    out_dir = SPRITES
    if '--out' in argv:
        out_dir = argv[argv.index('--out') + 1]
    req = reqs[rid]
    raw, img = read_image(src)
    keyed = img if has_alpha(img) else key_background(img)
    lab, figs = figures(keyed, req.get('merge', MERGE), req.get('rows', 1))
    want = len(req['outputs'])
    print(f'{rid}: found {len(figs)} figure(s) in a {img.width}x{img.height} image, need {want}')
    if len(figs) < want:
        print('  not enough separate figures: regenerate (figures must not touch) or cut by hand')
        return 1
    if len(figs) > want:
        # keep the biggest ones, still in left-to-right order
        biggest = sorted(figs, key=lambda f: -f['area'])[:want]
        figs = [f for f in figs if f in biggest]
    manifest_path = os.path.join(out_dir, 'manifest.json')
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding='utf8') as f:
            manifest = json.load(f)
    os.makedirs(out_dir, exist_ok=True)
    scale = None
    if req.get('uniform'):
        u = req['uniform']
        hs = [crop_figure(keyed, lab, f).height - 2 * PAD for f, o in zip(figs, req['outputs']) if o['sprite'] in u['ref']]
        scale = u['height'] / float(np.median(hs))
        print(f'  uniform scale {scale:.3f} (reference heights {hs})')
    made = {}
    for fig, o in zip(figs, req['outputs']):
        sprite = cut(keyed, lab, fig, o.get('height'), scale)
        if o.get('match') in made:
            sprite = sprite.resize(made[o['match']].size, Image.LANCZOS)
        made[o['sprite']] = sprite
        if o.get('mirror'):
            sprite = sprite.transpose(Image.FLIP_LEFT_RIGHT)
        path = os.path.join(out_dir, o['sprite'] + '.webp')
        sprite.save(path, 'WEBP', quality=90, method=6)
        manifest[o['sprite']] = {'w': sprite.width, 'h': sprite.height, 'sheet': 'generated:' + rid}
        print(f"  {o['sprite']}: {sprite.width}x{sprite.height}" + (f"  feet ax {feet_anchor(sprite)}" if scale else ''))
    with open(manifest_path, 'w', encoding='utf8') as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
    if '--preview' in argv:
        prev = os.path.join(out_dir, rid + '_keyed.png')
        keyed.save(prev)
        print('  preview:', prev)
    if out_dir == SPRITES:
        # keep the original, losslessly (WebP is far smaller than the PNG the generator returns)
        os.makedirs(ORIGINALS, exist_ok=True)
        Image.open(io.BytesIO(raw)).save(os.path.join(ORIGINALS, rid + '.webp'), 'WEBP', lossless=True, quality=100, method=4, exact=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
