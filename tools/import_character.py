#!/usr/bin/env python3
"""Import a character from a full-body image and a 3x3 sheet of portraits.

Usage:
  python3 tools/import_character.py <sprite-name> <portrait-prefix> <body.png> <faces.png> [--h 640]

  e.g. python3 tools/import_character.py npc_walt walt walt_body.png walt_faces.png

Both images need a transparent background. The portrait sheet is 3 rows of 3 busts, in this
order (the same on every sheet):
    worried   laugh      smile
    thinking  tired      surprised
    content   sad        sly
The tool writes web/assets/sprites/<sprite-name>.webp (trimmed, <h> px tall) and
face_<prefix>_<expression>.webp for the nine expressions, registers them in manifest.json and
keeps the originals in art/source/characters/. In web/js/data/characters.js give the character
exprs: EXPRS9 and aliases: ALIASES9 so every expression the scripts ask for maps to one of these.
"""
import os
import shutil
import sys
import json

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, 'web', 'assets', 'sprites')
ORIGINALS = os.path.join(ROOT, 'art', 'source', 'characters')
EXPRS = ['worried', 'laugh', 'smile', 'thinking', 'tired', 'surprised', 'content', 'sad', 'sly']
PAD = 6


def clean_alpha(im):
    """Drop faint specks and any colour left in fully transparent pixels."""
    a = np.array(im.convert('RGBA'))
    solid = a[..., 3] > 24
    lab, n = ndi.label(ndi.binary_dilation(solid, iterations=2))
    if n > 1:
        sizes = ndi.sum(solid, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.002 * solid.sum()])
        a[~keep] = 0
    a[a[..., 3] < 6] = 0
    return Image.fromarray(a, 'RGBA')


def trim(im, pad=PAD):
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 8)
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad))
    return im.crop(box)


def gutters(profile, n, reach=70):
    """Split positions for n equal parts: the emptiest line near each 1/n mark."""
    size = len(profile)
    cuts = [0]
    for k in range(1, n):
        mark = k * size // n
        lo, hi = max(1, mark - reach), min(size - 1, mark + reach)
        cuts.append(min(range(lo, hi), key=lambda i: (profile[i], abs(i - mark))))
    return cuts + [size]


def busts(sheet):
    """The nine busts, row by row, split along the empty gutters between them."""
    a = np.asarray(sheet)[..., 3] > 24
    ys = gutters(a.sum(1), 3)
    out = []
    for r in range(3):
        band = a[ys[r]:ys[r + 1]]
        xs = gutters(band.sum(0), 3)
        for c in range(3):
            cell = sheet.crop((xs[c], ys[r], xs[c + 1], ys[r + 1]))
            out.append(trim(clean_alpha(cell)))
    return out


def main(argv):
    if len(argv) < 4 or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    sprite, prefix, body_path, faces_path = argv[:4]
    height = int(argv[argv.index('--h') + 1]) if '--h' in argv else 640
    with open(os.path.join(SPRITES, 'manifest.json'), encoding='utf8') as f:
        manifest = json.load(f)
    body = trim(clean_alpha(Image.open(body_path)))
    k = height / body.height
    body = body.resize((round(body.width * k), height), Image.LANCZOS)
    body.save(os.path.join(SPRITES, sprite + '.webp'), 'WEBP', quality=90, method=6)
    manifest[sprite] = {'w': body.width, 'h': body.height, 'sheet': 'characters:' + prefix}
    print(f'{sprite}: {body.width}x{body.height}')
    for expr, im in zip(EXPRS, busts(Image.open(faces_path).convert('RGBA'))):
        name = f'face_{prefix}_{expr}'
        im.save(os.path.join(SPRITES, name + '.webp'), 'WEBP', quality=90, method=6)
        manifest[name] = {'w': im.width, 'h': im.height, 'sheet': 'characters:' + prefix}
        print(f'  {name}: {im.width}x{im.height}')
    with open(os.path.join(SPRITES, 'manifest.json'), 'w', encoding='utf8') as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
    os.makedirs(ORIGINALS, exist_ok=True)
    for src, tag in ((body_path, 'body'), (faces_path, 'faces')):
        Image.open(src).save(os.path.join(ORIGINALS, f'{prefix}_{tag}.webp'), 'WEBP', lossless=True, quality=100, method=4, exact=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
