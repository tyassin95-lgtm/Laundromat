#!/usr/bin/env python3
"""Turn a generated scene painting into a game background (web/assets/bg/<name>.webp).

Usage:
  python3 tools/import_scene.py <name> <image.png | https://...> [--keep-alpha-from OLD.webp] [--sky] [--preview DIR]

The painting is made from a composition reference: the current background padded at the bottom
to the model's aspect ratio (see "scenes" in tools/art_requests.json). This tool undoes that:
  1. scales the painting to the width of the current background and keeps its top rows
     (the padding at the bottom is dropped), so every coordinate in the scene code still fits,
  2. cuts out what has to be see-through:
       default   window glass: pure white areas that overlap the see-through parts of the
                 current background (so a white shirt on a peg stays), with a soft edge
       --sky     the sky: white connected to the top edge (exterior scenes),
  3. writes web/assets/bg/<name>.webp and keeps the original painting (WebP, quality 95: 4K
     paintings are too big to keep losslessly) in art/source/generated/<name>_bg.webp.
"""
import io
import os
import sys
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = os.path.join(ROOT, 'web', 'assets', 'bg')
ORIGINALS = os.path.join(ROOT, 'art', 'source', 'generated')

WHITE = 232        # every channel at least this bright ...
GREY = 18          # ... and this close to grey counts as "left white"
EDGE = 2           # feather (px) where glass meets frame


def read(src):
    if src.startswith(('http://', 'https://')):
        with urllib.request.urlopen(src, timeout=120) as r:
            raw = r.read()
    else:
        raw = open(src, 'rb').read()
    return raw, Image.open(io.BytesIO(raw)).convert('RGB')


def white_mask(rgb):
    a = rgb.astype(np.int16)
    return (a.min(-1) >= WHITE) & ((a.max(-1) - a.min(-1)) <= GREY)


def glass_alpha(rgb, old_alpha):
    """Transparent where the painting left white glass that overlaps the old see-through areas."""
    white = white_mask(rgb)
    lab, n = ndi.label(white)
    want = old_alpha < 128
    hits = np.unique(lab[want & white])
    glass = np.isin(lab, hits[hits > 0])
    # fill specks of reflection inside a pane, then soften the edge a little
    glass = ndi.binary_closing(glass, iterations=2) | glass
    dist = ndi.distance_transform_edt(~glass)
    alpha = np.clip(dist / EDGE, 0, 1) * 255
    return alpha


def sky_alpha(rgb):
    white = white_mask(rgb)
    lab, n = ndi.label(white)
    top = np.unique(lab[0][lab[0] > 0])
    sky = np.isin(lab, top)
    dist = ndi.distance_transform_edt(~sky)
    return np.clip(dist / EDGE, 0, 1) * 255


def unpremultiply_white(rgb, alpha):
    """Edge pixels are part white glass: take the white back out so no halo shows."""
    k = np.clip(alpha / 255.0, 1e-3, 1)[..., None]
    fg = np.clip((rgb.astype(np.float32) - 255 * (1 - k)) / k, 0, 255)
    edge = ((alpha > 0) & (alpha < 255))[..., None]
    return np.where(edge, fg, rgb).astype(np.uint8)


def main(argv):
    if len(argv) < 2 or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    name, src = argv[0], argv[1]
    cur_path = os.path.join(BG, name + '.webp')
    old_path = argv[argv.index('--keep-alpha-from') + 1] if '--keep-alpha-from' in argv else cur_path
    old = Image.open(old_path).convert('RGBA')
    W, H = old.size
    raw, img = read(src)
    scaled = img.resize((W, round(img.height * W / img.width)), Image.LANCZOS)
    if scaled.height < H:
        print(f'painting is too short: {scaled.height} < {H}')
        return 1
    rgb = np.asarray(scaled)[:H]
    if '--sky' in argv:
        alpha = sky_alpha(rgb)
    else:
        alpha = glass_alpha(rgb, np.asarray(old)[..., 3])
    out = np.dstack([unpremultiply_white(rgb, alpha), alpha.astype(np.uint8)])
    out[out[..., 3] == 0, :3] = 0
    Image.fromarray(out, 'RGBA').save(cur_path, 'WEBP', quality=88, method=6)
    clear = (alpha < 8).mean()
    print(f'{name}: {img.width}x{img.height} -> {W}x{H}, {clear * 100:.1f}% see-through -> {cur_path}')
    if '--preview' in argv:
        prev = Image.new('RGBA', (W, H), (255, 0, 255, 255))
        prev.alpha_composite(Image.fromarray(out, 'RGBA'))
        prev.convert('RGB').resize((W // 2, H // 2)).save(os.path.join(argv[argv.index('--preview') + 1], name + '_preview.png'))
    os.makedirs(ORIGINALS, exist_ok=True)
    Image.open(io.BytesIO(raw)).convert('RGB').save(os.path.join(ORIGINALS, name + '_bg.webp'), 'WEBP', quality=95, method=6)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
