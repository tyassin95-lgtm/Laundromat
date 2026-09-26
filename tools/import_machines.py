#!/usr/bin/env python3
"""Cut a generated sheet of washing machines or dryer towers into machine sprites.

Usage:
  python3 tools/import_machines.py <sheet.png | https://...> <sprite,sprite,...> --height H --hinge left|right
        [--open] [--preview DIR]

The sheet (see "washers" and "dryers" in tools/art_requests.json) is one row of machines seen
straight on, with the glass of every round door painted flat magenta. For each machine, left to
right, the tool:
  1. trims it and scales it to H px tall, and writes web/assets/sprites/<sprite>.webp with the
     magenta glass cut out (soft edge, no pink fringe), so the drum drawn behind shows through,
  2. measures each door: centre and radius of the glass (fractions of the sprite's width and
     height), the colour of the ring around it and its hinge side (--hinge: the side opposite
     the handle), and writes them all to web/js/data/machine_art.js for the scene to animate.
With --open the sheet shows the same machines with their doors swung open (the drum openings in
magenta): each becomes <sprite>_open.webp, lined up with the closed sprite on the side away from
the hinge (the open door sticks out on the hinge side), and its openings are measured the same way.
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
SPRITES = os.path.join(ROOT, 'web', 'assets', 'sprites')
ORIGINALS = os.path.join(ROOT, 'art', 'source', 'generated')
GEOM_JS = os.path.join(ROOT, 'web', 'js', 'data', 'machine_art.js')
PAD = 4


def read(src):
    if src.startswith(('http://', 'https://')):
        with urllib.request.urlopen(src, timeout=120) as r:
            raw = r.read()
    else:
        raw = open(src, 'rb').read()
    return raw, Image.open(io.BytesIO(raw)).convert('RGBA')


def magenta(a):
    """0..1: how much of a pixel is the flat magenta glass."""
    r, g, b = a[..., 0].astype(np.float32), a[..., 1].astype(np.float32), a[..., 2].astype(np.float32)
    return np.clip((np.minimum(r, b) - g - 60) / 130, 0, 1)


def machines(img):
    alpha = np.asarray(img)[..., 3] > 16
    lab, n = ndi.label(ndi.binary_dilation(alpha, iterations=4))
    boxes = [sl for sl in ndi.find_objects(lab)]
    areas = ndi.sum(alpha, lab, range(1, n + 1))
    keep = [(b, i + 1) for i, b in enumerate(boxes) if areas[i] > 0.01 * alpha.size]
    keep.sort(key=lambda t: t[0][1].start)
    return lab, keep


def cut(img, lab, box, label, height):
    ys, xs = box
    a = np.array(img)[ys, xs].copy()
    a[lab[ys, xs] != label] = 0
    rows = np.where(a[..., 3].max(1) > 8)[0]
    cols = np.where(a[..., 3].max(0) > 8)[0]
    a = a[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    h, w = a.shape[:2]
    canvas = np.zeros((h + 2 * PAD, w + 2 * PAD, 4), np.uint8)
    canvas[PAD:PAD + h, PAD:PAD + w] = a
    im = Image.fromarray(canvas, 'RGBA')
    k = height / im.height
    return im.resize((round(im.width * k), height), Image.LANCZOS)


def key_glass(im):
    a = np.asarray(im).astype(np.float32)
    m = magenta(a)
    holes = ndi.binary_opening(m > 0.6, iterations=2)
    lab, n = ndi.label(holes)
    doors = []
    H, W = m.shape
    for i, sl in enumerate(ndi.find_objects(lab)):
        area = (lab[sl] == i + 1).sum()
        if area < 0.01 * W * H:
            continue
        ys, xs = np.where(lab == i + 1)
        cx, cy = xs.mean(), ys.mean()
        r = np.sqrt(area / np.pi)
        doors.append((cx, cy, r))
    # soft alpha inside (and just around) the holes, and take the magenta back out of the edge
    near = ndi.binary_dilation(lab > 0, iterations=3)
    k = np.where(near, m, 0)
    alpha = a[..., 3] * (1 - k)
    M = np.array([255, 0, 255], np.float32)
    keep = np.clip(1 - k, 1e-3, 1)[..., None]
    rgb = np.clip((a[..., :3] - M * (1 - keep)) / keep, 0, 255)
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    out[out[..., 3] < 4] = 0
    return Image.fromarray(out, 'RGBA'), sorted(doors, key=lambda d: d[1])


def ring_colour(im, cx, cy, r):
    a = np.asarray(im).astype(np.float32)
    samples = []
    for t in np.linspace(0, 2 * np.pi, 72, endpoint=False):
        x, y = int(cx + np.cos(t) * r * 1.13), int(cy + np.sin(t) * r * 1.13)
        if 0 <= x < a.shape[1] and 0 <= y < a.shape[0] and a[y, x, 3] > 200:
            samples.append(a[y, x, :3])
    c = np.median(np.array(samples), axis=0) if samples else np.array([180, 180, 180])
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def main(argv):
    if len(argv) < 2 or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    src, names = argv[0], argv[1].split(',')
    height = int(argv[argv.index('--height') + 1])
    hinge = -1 if argv[argv.index('--hinge') + 1] == 'left' else 1
    raw, img = read(src)
    lab, found = machines(img)
    print(f'found {len(found)} machine(s), need {len(names)}')
    if len(found) != len(names):
        return 1
    with open(os.path.join(SPRITES, 'manifest.json'), encoding='utf8') as f:
        manifest = json.load(f)
    geom = {}
    if os.path.exists(GEOM_JS):
        text = open(GEOM_JS, encoding='utf8').read()
        geom = json.loads(text[text.index('{'):text.rindex('}') + 1])
    opening = '--open' in argv
    for name, (box, label) in zip(names, found):
        im = cut(img, lab, box, label, height)
        im, doors = key_glass(im)
        if opening:
            closed = geom[name]
            dx = closed['w'] - im.width if hinge < 0 else 0
            im.save(os.path.join(SPRITES, name + '_open.webp'), 'WEBP', quality=90, method=6)
            manifest[name + '_open'] = {'w': im.width, 'h': im.height, 'sheet': 'generated:machines'}
            closed['open'] = {
                'sprite': name + '_open', 'dx': round(dx / closed['w'], 4), 'w': round(im.width / closed['w'], 4),
                'doors': [{'cx': round(cx / im.width, 4), 'cy': round(cy / im.height, 4), 'r': round(r / im.width, 4)} for cx, cy, r in doors],
            }
            print(f'  {name}_open: {im.width}x{im.height} (closed {closed["w"]}), openings', [(round(cx), round(cy), round(r)) for cx, cy, r in doors])
            continue
        im.save(os.path.join(SPRITES, name + '.webp'), 'WEBP', quality=90, method=6)
        manifest[name] = {'w': im.width, 'h': im.height, 'sheet': 'generated:machines'}
        geom[name] = {
            **({'open': geom[name]['open']} if name in geom and 'open' in geom[name] else {}),
            'w': im.width, 'h': im.height,
            'doors': [{'cx': round(cx / im.width, 4), 'cy': round(cy / im.height, 4), 'r': round(r / im.width, 4),
                       'ring': ring_colour(im, cx, cy, r), 'hinge': hinge} for cx, cy, r in doors],
        }
        print(f'  {name}: {im.width}x{im.height}, doors', [(round(cx), round(cy), round(r)) for cx, cy, r in doors])
        if '--preview' in argv:
            prev = Image.new('RGBA', im.size, (40, 60, 70, 255))
            prev.alpha_composite(im)
            prev.convert('RGB').save(os.path.join(argv[argv.index('--preview') + 1], name + '_prev.png'))
    with open(os.path.join(SPRITES, 'manifest.json'), 'w', encoding='utf8') as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
    with open(GEOM_JS, 'w', encoding='utf8') as f:
        f.write('// Machine art, measured by tools/import_machines.py: each door\'s glass (centre and radius as\n'
                '// fractions of the sprite\'s width and height), its ring colour and hinge side (-1 left, 1 right).\n'
                'export const MACHINE_ART = ' + json.dumps(geom, indent=1, sort_keys=True) + ';\n')
    os.makedirs(ORIGINALS, exist_ok=True)
    Image.open(io.BytesIO(raw)).save(os.path.join(ORIGINALS, os.path.basename(src).rsplit('.', 1)[0] + '.webp'), 'WEBP', lossless=True, quality=100, method=4, exact=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
