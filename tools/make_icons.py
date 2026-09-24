"""Generate the Android launcher icons (legacy + adaptive) from the game's washer sprite.

Usage: python3 tools/make_icons.py
Writes android/app/src/main/res/mipmap-*/ic_launcher*.png and mipmap-anydpi-v26/*.xml.
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
SPRITE = os.path.join(ROOT, 'web', 'assets', 'sprites', 'machine_washer_idle.webp')
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
S = 1024  # master size (represents 108dp for adaptive layers)


def background(size):
    """Rainy night teal with a warm window glow, like the shop from across the street."""
    im = Image.new('RGBA', (size, size))
    px = im.load()
    cx, cy = size * 0.5, size * 0.5
    for y in range(size):
        for x in range(size):
            t = y / size
            base = (int(22 + 18 * t), int(52 + 20 * t), int(60 + 14 * t))
            d = math.hypot(x - cx, y - cy) / (size * 0.62)
            g = max(0.0, 1 - d) ** 1.6
            r = min(255, int(base[0] + 235 * g))
            gg = min(255, int(base[1] + 165 * g))
            b = min(255, int(base[2] + 70 * g))
            px[x, y] = (r, gg, b, 255)
    # soft rain streaks
    rain = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(rain)
    rnd = random.Random(7)
    for _ in range(70):
        x = rnd.uniform(0, size); y = rnd.uniform(0, size); ln = rnd.uniform(size * 0.03, size * 0.07)
        d.line([(x, y), (x - ln * 0.18, y + ln)], fill=(220, 235, 245, rnd.randint(40, 90)), width=max(1, size // 300))
    rain = rain.filter(ImageFilter.GaussianBlur(size / 900))
    im.alpha_composite(rain)
    return im


def foreground(size, scale=0.56):
    """The washer, centred inside the adaptive-icon safe zone, with a soft shadow."""
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    spr = Image.open(SPRITE).convert('RGBA')
    h = int(size * scale)
    w = int(spr.width * h / spr.height)
    spr = spr.resize((w, h), Image.LANCZOS)
    x, y = (size - w) // 2, (size - h) // 2 + int(size * 0.02)
    sh = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    a = spr.split()[3].point(lambda v: int(v * 0.55))
    blk = Image.new('RGBA', spr.size, (10, 6, 4, 255)); blk.putalpha(a)
    sh.paste(blk, (x + int(size * 0.012), y + int(size * 0.02)), blk)
    sh = sh.filter(ImageFilter.GaussianBlur(size / 90))
    im.alpha_composite(sh)
    im.alpha_composite(spr, (x, y))
    return im


def rounded(im, radius_frac):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=int(im.width * radius_frac), fill=255)
    out = im.copy(); out.putalpha(mask)
    return out


def circle(im):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, im.width - 1, im.height - 1], fill=255)
    out = im.copy(); out.putalpha(mask)
    return out


def main():
    bg = background(S)
    fg = foreground(S)
    # legacy icon: the 108dp art cropped to the central 72dp (like the launcher mask would)
    full = bg.copy(); full.alpha_composite(fg)
    crop = int(S * (18 / 108))
    legacy = full.crop((crop, crop, S - crop, S - crop))
    for name, k in DENS.items():
        d = os.path.join(RES, 'mipmap-' + name)
        os.makedirs(d, exist_ok=True)
        n48 = int(48 * k)
        rounded(legacy.resize((n48, n48), Image.LANCZOS), 0.18).save(os.path.join(d, 'ic_launcher.png'))
        circle(legacy.resize((n48, n48), Image.LANCZOS)).save(os.path.join(d, 'ic_launcher_round.png'))
        n108 = int(108 * k)
        fg.resize((n108, n108), Image.LANCZOS).save(os.path.join(d, 'ic_launcher_fg.png'))
        bg.resize((n108, n108), Image.LANCZOS).save(os.path.join(d, 'ic_launcher_bg.png'))
    any_dir = os.path.join(RES, 'mipmap-anydpi-v26')
    os.makedirs(any_dir, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@mipmap/ic_launcher_bg" />\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_fg" />\n'
           '</adaptive-icon>\n')
    for n in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        with open(os.path.join(any_dir, n), 'w') as f:
            f.write(xml)
    # store/preview icon
    rounded(legacy.resize((512, 512), Image.LANCZOS), 0.18).save(os.path.join(ROOT, 'art', 'icon_512.png'))
    print('icons written')


if __name__ == '__main__':
    main()
