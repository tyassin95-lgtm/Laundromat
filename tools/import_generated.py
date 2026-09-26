#!/usr/bin/env python3
"""Turn a generated image (character on a flat background) into game sprites.

Usage:
  python3 tools/import_generated.py --list
  python3 tools/import_generated.py <request-id> <image.png | https://...> [--out DIR] [--preview]

<request-id> is one of the requests in tools/art_requests.json (--list shows them, with the
prompt to generate and which of its sprites exist already). The tool:
  1. keys out the flat background (flood-filled from the image border, so white inside a
     character, like a shirt, stays),
  2. finds the separate figures and matches them to the request's outputs left to right,
  3. trims each, scales it to the output height and writes web/assets/sprites/<name>.webp,
  4. records the size in manifest.json, and keeps the original in art/source/generated/.
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


def figures(img):
    alpha = np.asarray(img)[..., 3]
    mask = alpha > 16
    merged = ndi.binary_dilation(mask, iterations=MERGE)
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
    return lab, found


def cut(img, lab, fig, height):
    x0, y0, x1, y1 = fig['box']
    a = np.array(img)
    keep = lab[y0:y1, x0:x1] == fig['label']
    crop = a[y0:y1, x0:x1].copy()
    crop[~keep] = 0
    h, w = crop.shape[:2]
    canvas = np.zeros((h + 2 * PAD, w + 2 * PAD, 4), np.uint8)
    canvas[PAD:PAD + h, PAD:PAD + w] = crop
    im = Image.fromarray(canvas, 'RGBA')
    scale = height / im.height
    return im.resize((max(1, round(im.width * scale)), height), Image.LANCZOS)


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
    keyed = key_background(img)
    lab, figs = figures(keyed)
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
    for fig, o in zip(figs, req['outputs']):
        sprite = cut(keyed, lab, fig, o['height'])
        path = os.path.join(out_dir, o['sprite'] + '.webp')
        sprite.save(path, 'WEBP', quality=90, method=6)
        manifest[o['sprite']] = {'w': sprite.width, 'h': sprite.height, 'sheet': 'generated:' + rid}
        print(f"  {o['sprite']}: {sprite.width}x{sprite.height}")
    with open(manifest_path, 'w', encoding='utf8') as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
    if '--preview' in argv:
        prev = os.path.join(out_dir, rid + '_keyed.png')
        keyed.save(prev)
        print('  preview:', prev)
    if out_dir == SPRITES:
        os.makedirs(ORIGINALS, exist_ok=True)
        with open(os.path.join(ORIGINALS, rid + '.png'), 'wb') as f:
            f.write(raw)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
