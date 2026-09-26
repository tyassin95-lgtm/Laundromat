#!/usr/bin/env python3
"""Turn a generated scene painting into a game background (web/assets/bg/<name>.webp).

Usage:
  python3 tools/import_scene.py <name> <image.png | https://...> --world W [--height H]
        [--keep top|bottom] [--shift N] [--glass "x0,y0,x1,y1;..."] [--sky [--holes Y]] [--night NIGHT.png]
        [--preview DIR]

Scenes are painted from a flat colour blocking in world px (tools/art_requests.json, "scenes"),
padded to the model's aspect ratio. This tool undoes that:
  1. scales the painting to W * 1.5 px wide and keeps H * 1.5 rows (H defaults to 720) from the
     top (interiors, padded at the bottom) or from the bottom (exteriors, padded with sky);
     --shift N moves that window N world px up the painting (when the ground came out higher
     than the blocking asked for, so the walkable band still lands where the scene expects it),
  2. cuts out what has to be see-through, with a soft edge and without a white halo:
       --glass   pure white areas touching any of these world rects (window panes)
       --sky     pure white connected to the top edge (open sky: exteriors and window views);
                 --holes Y also opens up enclosed white gaps above world y Y (between the struts
                 of a bridge or a crane, the bare floors of a building going up)
  3. with --night, extracts <name>_lights.webp: what glows in the night version of the painting
     (lit windows, lamps, signs), to be added over the day painting after dark,
  4. writes web/assets/bg/<name>.webp and keeps the original painting (WebP, quality 95: 4K
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
SCALE = 1.5        # background px per world px

WHITE = 232        # every channel at least this bright ...
GREY = 18          # ... and this close to grey counts as "left white"
EDGE = 2           # feather (px) where glass or sky meets the painting


def read(src):
    if src.startswith(('http://', 'https://')):
        with urllib.request.urlopen(src, timeout=120) as r:
            raw = r.read()
    else:
        raw = open(src, 'rb').read()
    return raw, Image.open(io.BytesIO(raw)).convert('RGB')


def fit(img, W, H, keep, shift=0):
    """Scale to W wide and keep H rows from the top or the bottom (moved up by shift px)."""
    scaled = img.resize((W, round(img.height * W / img.width)), Image.LANCZOS)
    if scaled.height < H:
        raise SystemExit(f'painting is too short: {scaled.height} < {H}')
    top = (0 if keep == 'top' else scaled.height - H) - shift
    if top < 0 or top + H > scaled.height:
        raise SystemExit(f'--shift moves the window off the painting (top {top})')
    return np.asarray(scaled)[top:top + H]


def white_mask(rgb):
    a = rgb.astype(np.int16)
    return (a.min(-1) >= WHITE) & ((a.max(-1) - a.min(-1)) <= GREY)


def soft(mask):
    mask = ndi.binary_closing(mask, iterations=2) | mask
    dist = ndi.distance_transform_edt(~mask)
    return np.clip(dist / EDGE, 0, 1) * 255


def glass_alpha(rgb, rects):
    white = white_mask(rgb)
    lab, _ = ndi.label(white)
    hits = set()
    for x0, y0, x1, y1 in rects:
        sub = lab[round(y0 * SCALE):round(y1 * SCALE), round(x0 * SCALE):round(x1 * SCALE)]
        hits.update(np.unique(sub[sub > 0]).tolist())
    return soft(np.isin(lab, list(hits)))


def sky_alpha(rgb, holes_above=None):
    white = white_mask(rgb)
    lab, _ = ndi.label(white)
    top = np.unique(lab[0][lab[0] > 0])
    sky = np.isin(lab, top)
    if holes_above is not None:
        limit = round(holes_above * SCALE)
        for i, sl in enumerate(ndi.find_objects(lab)):
            if sl is not None and sl[0].stop <= limit and (lab[sl] == i + 1).sum() >= 30:
                sky |= lab == i + 1
    return soft(sky)


def unpremultiply_white(rgb, alpha):
    """Edge pixels are part white: take the white back out so no halo shows."""
    k = np.clip(alpha / 255.0, 1e-3, 1)[..., None]
    fg = np.clip((rgb.astype(np.float32) - 255 * (1 - k)) / k, 0, 255)
    edge = ((alpha > 0) & (alpha < 255))[..., None]
    return np.where(edge, fg, rgb).astype(np.uint8)


def lights(day, night, alpha):
    """What glows at night: bright, warm pixels of the night painting that the day one lacks."""
    d = day.astype(np.float32)
    n = night.astype(np.float32)
    glow = np.clip(n - 0.55 * d, 0, 255)
    lum = n.max(-1)
    warm = np.clip((lum - 120) / 90, 0, 1) * np.clip((n[..., 0] - n[..., 2] + 40) / 80, 0, 1)
    out = glow * warm[..., None]
    out = ndi.gaussian_filter(out, sigma=(1.2, 1.2, 0))
    out *= (alpha[..., None] / 255.0)
    return np.clip(out, 0, 255).astype(np.uint8)


def arg(argv, key, default=None):
    return argv[argv.index(key) + 1] if key in argv else default


def main(argv):
    if len(argv) < 2 or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    name, src = argv[0], argv[1]
    world = int(arg(argv, '--world'))
    height = int(arg(argv, '--height', 720))
    keep = arg(argv, '--keep', 'top')
    shift = round(float(arg(argv, '--shift', 0)) * SCALE)
    W, H = round(world * SCALE), round(height * SCALE)
    raw, img = read(src)
    rgb = fit(img, W, H, keep, shift)
    if '--sky' in argv:
        alpha = sky_alpha(rgb, float(arg(argv, '--holes')) if '--holes' in argv else None)
    elif '--glass' in argv:
        rects = [tuple(float(v) for v in r.split(',')) for r in arg(argv, '--glass').split(';') if r.strip()]
        alpha = glass_alpha(rgb, rects)
    else:
        alpha = np.full(rgb.shape[:2], 255.0)
    out = np.dstack([unpremultiply_white(rgb, alpha), alpha.astype(np.uint8)])
    out[out[..., 3] == 0, :3] = 0
    path = os.path.join(BG, name + '.webp')
    Image.fromarray(out, 'RGBA').save(path, 'WEBP', quality=88, method=6)
    print(f'{name}: {img.width}x{img.height} -> {W}x{H}, {(alpha < 8).mean() * 100:.1f}% see-through -> {path}')
    if '--night' in argv:
        _, nimg = read(arg(argv, '--night'))
        glow = lights(rgb, fit(nimg, W, H, keep, shift), alpha)
        Image.fromarray(glow, 'RGB').save(os.path.join(BG, name + '_lights.webp'), 'WEBP', quality=85, method=6)
        print(f'  + {name}_lights.webp')
    if '--preview' in argv:
        prev = Image.new('RGBA', (W, H), (255, 0, 255, 255))
        prev.alpha_composite(Image.fromarray(out, 'RGBA'))
        prev.convert('RGB').resize((W // 2, H // 2)).save(os.path.join(arg(argv, '--preview'), name + '_preview.png'))
    os.makedirs(ORIGINALS, exist_ok=True)
    Image.open(io.BytesIO(raw)).convert('RGB').save(os.path.join(ORIGINALS, name + '_bg.webp'), 'WEBP', quality=95, method=6)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
