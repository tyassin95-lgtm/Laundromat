"""Derived sprites built from the source sheets (called by slice_sheets.py).

The uploaded art has full-body sprites only for Maya and Walt. June and Remy only have
portrait sheets, so their in-world bodies are composited: a recoloured copy of Maya's body
(the pose that suits them best) topped with their own portrait head and shoulders.
Replace web/assets/sprites/npc_june.webp / npc_remy.webp with real art any time.
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'source')


def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rm = nz & (mx == r)
    gm = nz & (mx == g) & ~rm
    bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = ((b - r)[gm] / d[gm]) + 2
    h[bm] = ((r - g)[bm] / d[bm]) + 4
    h = h / 6.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return np.stack([h, s, mx], -1)


def hsv_to_rgb(hsv):
    h, s, v = hsv[..., 0] * 6, hsv[..., 1], hsv[..., 2]
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))
    out = np.zeros(hsv.shape)
    for k, (a, b, c) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[..., 0][m], out[..., 1][m], out[..., 2][m] = a[m], b[m], c[m]
    return out


def recolor(hsv, mask, hue, sat, vmul, vadd=0.0, keep_sat=0.0):
    hsv[..., 0][mask] = hue / 360.0
    hsv[..., 1][mask] = np.clip(sat * (1 - keep_sat) + hsv[..., 1][mask] * keep_sat, 0, 1)
    hsv[..., 2][mask] = np.clip(hsv[..., 2][mask] * vmul + vadd, 0, 1)


def maya_body_masks(hsv, h, w):
    H = hsv[..., 0] * 360
    S = hsv[..., 1]
    V = hsv[..., 2]
    yy, xx = np.mgrid[0:h, 0:w]
    shirt = (H > 24) & (H < 52) & (V > 0.6) & (S > 0.42) & (yy > 300) & (yy < 640) & (xx > 95) & (xx < 300)
    jacket = (H >= 25) & (H < 95) & ~shirt & (yy > 230) & (yy < 840) & (V > 0.08)
    jeans = (H > 180) & (H < 260) & (yy > 540) & (yy < 1195)
    boots = (yy >= 1170) & (H > 10) & (H < 50) & (V > 0.12)
    return shirt, jacket, jeans, boots


def composite_npc(portrait_file, cell, scale, offset, palette, out_name, fade=70):
    body = Image.open(os.path.join(SRC, 'maya_full.png')).convert('RGBA')
    arr = np.array(body).astype(float)
    h, w = arr.shape[:2]
    hsv = rgb_to_hsv(arr[..., :3] / 255.0)
    shirt, jacket, jeans, boots = maya_body_masks(hsv, h, w)
    recolor(hsv, shirt, *palette['shirt'])
    recolor(hsv, jacket, *palette['jacket'])
    recolor(hsv, jeans, *palette['jeans'])
    recolor(hsv, boots, *palette['boots'])
    arr[..., :3] = hsv_to_rgb(hsv) * 255.0
    if palette.get('speckle'):
        # a hint of the floral print so the blouse continues the portrait's pattern
        rng = np.random.default_rng(7)
        ys, xs = np.nonzero(shirt)
        colors = [(200, 106, 58), (122, 138, 160), (214, 150, 110)]
        for i in rng.choice(len(xs), size=len(xs) // 90, replace=False):
            y, x = ys[i], xs[i]
            c = colors[rng.integers(len(colors))]
            r = 2 if rng.random() < 0.6 else 3
            arr[max(0, y - r):y + r, max(0, x - r):x + r, :3] = c
    # remove Maya's head, hair and headphones (and the hood behind her shoulder)
    cut = palette.get('cut_y', 312)
    arr[:cut, :, 3] = 0
    yy, xx = np.mgrid[0:h, 0:w]
    arr[(xx > 352) & (yy < 312 + (xx - 352) * 0.9), 3] = 0

    top_margin = 80
    canvas = np.zeros((h + top_margin, w + 40, 4))
    canvas[top_margin:, 20:20 + w] = arr

    por = Image.open(os.path.join(SRC, portrait_file)).convert('RGBA').crop(cell)
    por = por.resize((round(por.width * scale), round(por.height * scale)), Image.LANCZOS)
    pa = np.array(por).astype(float)
    # feather the bottom edge of the portrait into the body
    alpha = pa[..., 3]
    for x in range(pa.shape[1]):
        col = np.nonzero(alpha[:, x] > 20)[0]
        if len(col) == 0:
            continue
        bottom = col.max()
        start = bottom - fade
        for y in range(max(0, start), bottom + 1):
            k = 1.0 - (y - start) / float(fade)
            alpha[y, x] *= max(0.0, min(1.0, k * 1.6))
    pa[..., 3] = alpha
    ox, oy = offset[0] + 20, offset[1] + top_margin
    ph, pw = pa.shape[:2]
    # alpha-composite portrait over body
    y0, y1 = max(0, oy), min(canvas.shape[0], oy + ph)
    x0, x1 = max(0, ox), min(canvas.shape[1], ox + pw)
    src = pa[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    dst = canvas[y0:y1, x0:x1]
    sa = src[..., 3:4] / 255.0
    da = dst[..., 3:4] / 255.0
    oa = sa + da * (1 - sa)
    rgb = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    canvas[y0:y1, x0:x1, :3] = rgb
    canvas[y0:y1, x0:x1, 3:4] = oa * 255.0

    img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), 'RGBA')
    bbox = img.getbbox()
    return img.crop(bbox)


PALETTES = {
    # Remy: black denim jacket, red shirt, black jeans, dark boots
    'remy': {
        'shirt': (356, 0.62, 0.52),
        'jacket': (22, 0.16, 0.56, 0.0),
        'jeans': (230, 0.18, 0.62),
        'boots': (20, 0.35, 0.45),
    },
    # June: rust cardigan, cream floral blouse, brown slacks, brown shoes
    'june': {
        'shirt': (31, 0.33, 0.97),
        'speckle': True,
        'jacket': (17, 0.68, 1.35, 0.05),
        'jeans': (25, 0.35, 1.25, 0.05),
        'boots': (22, 0.55, 0.6),
    },
}


def build(out_dir, manifest):
    specs = [
        # name, portrait sheet, cell box (source px), scale, offset in Maya-body coords
        ('npc_remy', 'portrait_pink.png', (5, 21, 678, 1024), 0.52, (8, -30), 'remy', 70),
        ('npc_june', 'portrait_june.png', (7, 102, 676, 995), 0.50, (18, -4), 'june', 48),
    ]
    for name, sheet, cell, scale, offset, pal, fade in specs:
        img = composite_npc(sheet, cell, scale, offset, PALETTES[pal], name, fade)
        target_h = 575
        s = target_h / img.height
        img = img.resize((round(img.width * s), target_h), Image.LANCZOS)
        a = np.array(img)
        a[a[..., 3] == 0, :3] = 0
        img = Image.fromarray(a, 'RGBA')
        img.save(os.path.join(out_dir, name + '.webp'), 'WEBP', quality=90, method=6, alpha_quality=100)
        manifest[name] = {'w': img.width, 'h': img.height, 'sheet': 'derived'}
        print('derived', name, img.size)


if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', '.cache')
    m = {}
    build(out, m)


# ---------------------------------------------------------------------------------------
# Interaction-pose layers. Coordinates are given for the reference sprite sizes below and
# are rescaled automatically if the slicing scale changes.
# ---------------------------------------------------------------------------------------
from PIL import ImageDraw  # noqa: E402

REF = {'player_fold': (277, 449), 'player_sit': (328, 421), 'player_load': (281, 446), 'player_reach': (244, 470)}


def _load(out_dir, name):
    img = Image.open(os.path.join(out_dir, name + '.webp')).convert('RGBA')
    rw, rh = REF[name]
    return img, img.width / rw, img.height / rh


def _mask(size, rects=(), polys=(), sx=1.0, sy=1.0):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    for x0, y0, x1, y1 in rects:
        d.rectangle([x0 * sx, y0 * sy, x1 * sx, y1 * sy], fill=255)
    for poly in polys:
        d.polygon([(x * sx, y * sy) for x, y in poly], fill=255)
    return np.array(m) > 127


def _save(out_dir, manifest, name, arr):
    arr = arr.copy()
    arr[arr[..., 3] == 0, :3] = 0
    img = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    img.save(os.path.join(out_dir, name + '.webp'), 'WEBP', quality=90, method=4, alpha_quality=100)
    manifest[name] = {'w': img.width, 'h': img.height, 'sheet': 'derived'}
    print('derived', name, img.size)


def build_pose_layers(out_dir, manifest):
    # --- folding: table + stacks in front, player behind -------------------------------
    img, sx, sy = _load(out_dir, 'player_fold')
    a = np.array(img)
    front = _mask(img.size, rects=[(2, 262, 275, 304), (12, 300, 50, 449), (230, 300, 268, 449),
                                   (18, 239, 153, 293), (143, 250, 260, 293)], sx=sx, sy=sy)
    band = _mask(img.size, rects=[(2, 304, 275, 318)], sx=sx, sy=sy)
    hsv = rgb_to_hsv(a[..., :3] / 255.0)
    woody = (hsv[..., 0] * 360 > 12) & (hsv[..., 0] * 360 < 50) & (hsv[..., 1] > 0.3)
    dark_edge = hsv[..., 2] < 0.2
    front |= band & (woody | dark_edge)
    t = a.copy(); t[~front, 3] = 0
    b = a.copy(); b[front, 3] = 0
    _save(out_dir, manifest, 'prop_fold_table', t)
    _save(out_dir, manifest, 'player_fold_body', b)

    # --- sitting: an empty bench rebuilt from the visible plank ends --------------------
    img, sx, sy = _load(out_dir, 'player_sit')
    a = np.array(img).astype(float)
    y0, y1 = int(222 * sy), int(264 * sy)
    bench = np.zeros_like(a)
    bench[y0:y1] = a[y0:y1]
    # legs
    for lx0, lx1 in ((22, 66), (262, 306)):
        bench[y1:, int(lx0 * sx):int(lx1 * sx)] = a[y1:, int(lx0 * sx):int(lx1 * sx)]
    # refill the occluded middle of the plank with tiles of the clean left section
    src_x0, src_x1 = int(26 * sx), int(62 * sx)
    tile = a[y0:y1, src_x0:src_x1].copy()
    x = int(64 * sx)
    flip = False
    while x < int(264 * sx):
        tw = min(tile.shape[1], int(264 * sx) - x)
        piece = tile[:, ::-1] if flip else tile
        bench[y0:y1, x:x + tw] = piece[:, :tw]
        x += tw
        flip = not flip
    _save(out_dir, manifest, 'prop_bench', np.clip(bench, 0, 255))

    # --- loading: keep the player (and the bundle she holds), drop the baked-in washer ---
    img, sx, sy = _load(out_dir, 'player_load')
    a = np.array(img)
    body_poly = [(0, 0), (182, 0), (182, 58), (168, 74), (164, 92), (156, 104), (147, 112), (141, 140),
                 (146, 168), (156, 190), (164, 207), (186, 219), (201, 226), (214, 236), (214, 259),
                 (196, 264), (172, 252), (150, 240), (132, 229), (118, 221), (104, 213), (97, 215),
                 (95, 258), (100, 262), (100, 305), (113, 312), (114, 375), (119, 390), (116, 398),
                 (132, 403), (146, 408), (158, 414), (163, 422), (161, 436), (130, 441), (95, 446), (0, 446)]
    keep = _mask(img.size, polys=[body_poly], sx=sx, sy=sy)
    out = a.copy()
    out[~keep, 3] = 0
    _save(out_dir, manifest, 'player_load_arms', out)

    # --- reaching: remove the partial shelf, keep the raised arm -----------------------
    img, sx, sy = _load(out_dir, 'player_reach')
    a = np.array(img)
    shelf = _mask(img.size, rects=[(178, 0, 244, 140), (163, 88, 244, 140)],
                  polys=[[(120, 0), (176, 0), (176, 8), (150, 8), (138, 14), (124, 34), (112, 30)]], sx=sx, sy=sy)
    out = a.copy()
    out[shelf, 3] = 0
    _save(out_dir, manifest, 'player_reach_clean', out)


_build_npcs = build


def build(out_dir, manifest):  # noqa: F811 - extends the NPC build above
    _build_npcs(out_dir, manifest)
    build_pose_layers(out_dir, manifest)
