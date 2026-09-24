#!/usr/bin/env python3
"""Compose a quick preview of a baked background with sprites placed on it (dev aid)."""
import json, sys, os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.join(ROOT, 'web', 'assets', 'sprites')
S = 1.5

def sprite(name, h=None, w=None):
    im = Image.open(os.path.join(SP, name + '.webp')).convert('RGBA')
    if h: k = h * S / im.height
    else: k = w * S / im.width
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)

def place(bg, name, cx, by, h=None, w=None, flip=False):
    im = sprite(name, h, w)
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    bg.alpha_composite(im, (round(cx * S - im.width / 2), round(by * S - im.height)))

def main(bgfile, out, items, outside=None):
    bg = Image.open(bgfile).convert('RGBA')
    base = Image.new('RGBA', bg.size, (0, 0, 0, 255))
    if outside:
        d = ImageDraw.Draw(base)
        for y in range(bg.height):
            t = y / bg.height
            col = tuple(int(a + (b - a) * t) for a, b in zip(outside[0], outside[1]))
            d.line([(0, y), (bg.width, y)], fill=col + (255,))
    base.alpha_composite(bg)
    for it in items:
        place(base, *it)
    base.convert('RGB').save(out, quality=88)

if __name__ == '__main__':
    scene = sys.argv[1]
    variant = sys.argv[2] if len(sys.argv) > 2 else 'day'
    out = os.path.join(ROOT, 'tools', '.cache', 'preview_%s_%s.jpg' % (scene, variant))
    if scene == 'laundromat':
        items = [
            ('furn_tall_shelf', 205, 470, 230),
            ('furn_counter', 220, 560, 150),
            ('decor_wall_shelf', 450, 262, None, 130),
            ('prop_fold_table', 445, 590, 205),
            ('machine_washer_idle', 600, 506, 212), ('machine_washer_running', 750, 506, 212),
            ('machine_washer_open', 900, 506, 212), ('machine_washer_orange', 1050, 506, 212),
            ('machine_washer_blue', 1200, 506, 212),
            ('machine_stack_unit', 1340, 506, 300), ('machine_stack_unit', 1480, 506, 300),
            ('prop_bench', 1680, 640, 120),
            ('furn_potted_plant', 1580, 600, 110),
            ('decor_cork_board', 1470, 150, None, 0),
            ('player_carry', 820, 640, 262),
            ('npc_walt', 1600, 690, 285),
        ]
        items = [i for i in items if not (len(i) > 4 and i[4] == 0)]
        main(os.path.join(ROOT, 'web', 'assets', 'bg', 'laundromat.webp'), out, items,
             outside=((30, 40, 70), (60, 70, 90)) if variant == 'night' else ((150, 180, 200), (210, 200, 180)))
    print(out)

if __name__ == '__main__':
    pass
