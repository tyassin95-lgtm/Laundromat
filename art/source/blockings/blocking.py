# Blocking layouts for the pure-2D scenes, in world px (drawn at 1.5x = background px).
# Flat colour regions tell the painter where every wall, door, window and fixture goes.
# White = keep pure white (glass / sky), keyed out to transparent afterwards.
from PIL import Image, ImageDraw
import sys
OUT = __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '/'
S = 1.5
WHITE = (255, 255, 255)
INK = (60, 45, 35)

def canvas(world_w, world_h=720, extra_bottom=0, extra_top=0, bg=WHITE):
    W = round(world_w * S); H = round((world_h + extra_bottom + extra_top) * S)
    im = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(im)
    oy = extra_top
    def R(x0, y0, x1, y1, col, outline=INK, w=3):
        d.rectangle([x0 * S, (y0 + oy) * S, x1 * S, (y1 + oy) * S], fill=col, outline=outline, width=w)
    def E(x0, y0, x1, y1, col, outline=INK, w=3):
        d.ellipse([x0 * S, (y0 + oy) * S, x1 * S, (y1 + oy) * S], fill=col, outline=outline, width=w)
    def P(pts, col, outline=INK):
        d.polygon([(x * S, (y + oy) * S) for x, y in pts], fill=col, outline=outline)
    def L(pts, col, w=6):
        d.line([(x * S, (y + oy) * S) for x, y in pts], fill=col, width=round(w * S))
    return im, R, E, P, L

def pad_to(im, ratio, where='bottom', fill=None):
    """Pad an image to width/height = ratio by extending the bottom (or top) rows."""
    W, H = im.size
    H2 = round(W / ratio)
    if H2 <= H: return im, 0
    out = Image.new('RGB', (W, H2), fill or WHITE)
    if where == 'bottom':
        out.paste(im, (0, 0))
        strip = im.crop((0, H - 2, W, H)).resize((W, H2 - H))
        if fill is None: out.paste(strip, (0, H))
        return out, 0
    out.paste(im, (0, H2 - H))
    return out, H2 - H

def checker(R, x0, x1, y0, y1, size, c1, c2):
    row = 0
    y = y0
    while y < y1:
        k = 0
        x = x0
        while x < x1:
            R(x, y, min(x1, x + size), min(y1, y + size), c1 if (k + row) % 2 == 0 else c2, None)
            x += size; k += 1
        y += size; row += 1

def laundromat():
    WW = 2080
    im, R, E, P, L = canvas(WW, 891)
    MINT, TILE, TEAL, CREAM, WOOD, DARK, COPPER = (170, 200, 175), (232, 218, 180), (50, 110, 115), (240, 228, 200), (150, 95, 55), (70, 60, 55), (190, 110, 60)
    R(0, 0, WW, 58, (205, 195, 170), None)            # pressed tin ceiling
    R(0, 58, WW, 70, WOOD, None)                      # crown moulding
    R(0, 70, WW, 396, MINT, None)                     # upper wall
    R(0, 396, WW, 408, WOOD, None)                    # chair rail
    R(0, 408, WW, 594, TILE, None)                    # tile wainscot
    for x in range(0, WW, 36): L([(x, 408), (x, 594)], (205, 190, 150), 1.5)
    for y in range(444, 594, 36): L([(0, y), (WW, y)], (205, 190, 150), 1.5)
    R(0, 594, WW, 606, TEAL, None)                    # baseboard
    checker(R, 0, WW, 606, 891, 48, TEAL, CREAM)      # flat checker floor band
    # back door UPSTAIRS + sign
    R(10, 248, 126, 606, (110, 70, 45)); R(18, 256, 118, 606, (140, 90, 55)); R(34, 272, 102, 352, (90, 75, 70))
    E(100, 430, 112, 442, (200, 170, 80)); R(22, 186, 118, 238, (60, 100, 110))
    # blank chalkboard
    R(262, 140, 478, 290, (120, 80, 50)); R(274, 152, 466, 278, (45, 70, 60))
    # plumbing: one copper line along the wall, a drop with a red and a blue tap over each washer bay
    L([(610, 312), (1340, 312)], COPPER, 9)
    for i in range(5):
        x = 690 + i * 144
        for dx, cap in ((-34, (190, 50, 45)), (34, (50, 90, 170))):
            L([(x + dx, 312), (x + dx, 420)], COPPER, 8)
            E(x + dx - 12, 350, x + dx + 12, 366, cap)
    # dryer vent ducts down to the dryer tops (y 312)
    for x in (1420, 1560):
        R(x - 24, 70, x + 24, 312, (185, 188, 190))
        for yy in range(88, 312, 20): L([(x - 24, yy), (x + 24, yy)], (140, 140, 145), 2)
    R(1464, 132, 1516, 184, (235, 225, 200))          # LINT sign
    # pendant lamps
    for x in (370, 830, 1190, 1850):
        L([(x, 70), (x, 112)], DARK, 3); P([(x - 34, 146), (x - 16, 112), (x + 16, 112), (x + 34, 146)], (45, 110, 115)); E(x - 10, 140, x + 10, 158, (255, 240, 180))
    # front window: transom row of three small panes, one big pane below (glass stays white)
    R(1700, 140, 1942, 556, (60, 100, 110))
    R(1712, 152, 1930, 540, WHITE)
    R(1712, 226, 1930, 240, (60, 100, 110))
    for x in (1784, 1858): R(x - 5, 152, x + 5, 226, (60, 100, 110))
    R(1690, 540, 1952, 558, WOOD)                     # sill ledge
    # front door: transom glass, door leaf with a tall glass panel, push bar and kick plate
    R(1950, 140, 2080, 606, (60, 100, 110)); R(1962, 152, 2070, 226, WHITE)
    R(1962, 236, 2070, 606, (70, 120, 125)); R(1974, 250, 2058, 520, WHITE)
    R(1976, 528, 2056, 540, (190, 190, 190)); R(1976, 546, 2056, 600, (180, 150, 90))
    # welcome mat on the floor + drain
    R(1946, 646, 2074, 690, (150, 70, 50)); E(1130, 668, 1190, 682, (60, 60, 60))
    return im

def home():
    WW = 1600
    im, R, E, P, L = canvas(WW, 900)
    WALL, WAIN, WOOD, TEAL, DARK = (228, 190, 175), (140, 95, 60), (170, 115, 70), (60, 120, 130), (90, 60, 45)
    R(0, 0, WW, 40, (75, 50, 38), None)
    for x in range(0, WW, 175): R(x, 0, x + 26, 40, (55, 38, 30), None)
    R(0, 40, WW, 480, WALL, None)
    for x in range(20, WW, 60):
        for y in range(70, 470, 60): E(x - 3, y - 3, x + 3, y + 3, (210, 165, 150), None)
    R(0, 480, WW, 594, WAIN, None)
    for x in range(0, WW, 60): L([(x, 486), (x, 590)], (120, 80, 50), 2)
    R(0, 594, WW, 606, (90, 60, 40), None)
    for row in range(0, 7):
        y0 = 606 + row * 46
        off = (row % 2) * 90
        R(0, y0, WW, y0 + 46, (180, 125, 75) if row % 2 else (165, 112, 68), None)
        for x in range(-off, WW, 180): L([(x, y0), (x, y0 + 46)], (110, 70, 40), 2)
    # door + hooks
    R(24, 240, 142, 606, (110, 75, 50)); R(32, 248, 134, 606, (145, 100, 65)); E(114, 430, 126, 442, (200, 170, 80))
    R(152, 300, 206, 310, WOOD); R(158, 310, 176, 380, (60, 130, 140)); R(184, 310, 202, 370, (210, 120, 60))
    # kitchenette
    R(220, 250, 480, 262, WOOD)                       # jar shelf
    for i, x in enumerate(range(232, 466, 40)): R(x, 212 - (i % 3) * 8, x + 26, 250, [(200, 180, 120), (230, 225, 210), (170, 90, 60)][i % 3])
    R(220, 360, 480, 456, (235, 232, 222))            # tiled splashback
    for x in range(220, 480, 26): L([(x, 360), (x, 456)], (205, 200, 190), 1)
    for y in range(386, 456, 26): L([(220, y), (480, y)], (205, 200, 190), 1)
    R(212, 456, 488, 470, WOOD)                       # counter top (things stand on y 456)
    R(220, 470, 480, 606, TEAL)                       # cabinets
    for x in (220, 306, 392): R(x + 6, 480, x + 82, 596, (70, 135, 145))
    R(244, 450, 336, 456, (40, 40, 40))               # hob
    L([(426, 456), (426, 412), (446, 412)], (180, 180, 185), 5)   # tap
    # window with curtains and window seat
    R(530, 72, 910, 426, (230, 220, 190)); R(546, 88, 894, 410, WHITE)
    L([(662, 88), (662, 410)], (230, 220, 190), 10); L([(778, 88), (778, 410)], (230, 220, 190), 10); L([(546, 249), (894, 249)], (230, 220, 190), 10)
    L([(480, 66), (960, 66)], DARK, 6)
    P([(484, 66), (554, 66), (546, 300), (522, 440), (488, 440)], (180, 70, 50)); P([(886, 66), (956, 66), (952, 440), (918, 440), (894, 300)], (180, 70, 50))
    R(516, 460, 924, 482, (70, 120, 130)); E(550, 430, 630, 470, (220, 170, 60)); E(810, 430, 890, 470, (190, 90, 50))
    R(522, 482, 918, 606, (120, 85, 55)); R(630, 512, 810, 580, (220, 220, 215))
    for x in range(640, 806, 12): L([(x, 518), (x, 574)], (170, 170, 165), 2)
    L([(720, 40), (720, 118)], DARK, 3); P([(686, 142), (702, 118), (738, 118), (754, 142)], (225, 170, 80))
    # book shelf over the desk
    R(980, 330, 1190, 340, WOOD)
    for i, x in enumerate(range(990, 1178, 16)): R(x, 276 + (i % 4) * 6, x + 13, 330, [(60, 110, 140), (180, 70, 50), (200, 160, 60), (90, 130, 80)][i % 4])
    return im

# ------------------------------------------------------------------ exteriors (sky = white)
def brick(R, L, x0, y0, x1, y1, col, mortar=(150, 80, 60)):
    R(x0, y0, x1, y1, col)
    for y in range(int(y0) + 16, int(y1), 16): L([(x0, y), (x1, y)], mortar, 1)

def win(R, L, x0, y0, x1, y1, frame=(235, 225, 205), glass=(95, 120, 140), sill=True):
    R(x0 - 6, y0 - 6, x1 + 6, y1 + 6, frame)
    R(x0, y0, x1, y1, glass)
    L([((x0 + x1) / 2, y0), ((x0 + x1) / 2, y1)], frame, 4)
    L([(x0, (y0 + y1) / 2), (x1, (y0 + y1) / 2)], frame, 4)
    if sill: R(x0 - 12, y1 + 6, x1 + 12, y1 + 14, (200, 190, 170))

def street():
    WW = 2600
    im, R, E, P, L = canvas(WW, 720)
    SIDE, CURB, ROAD = (200, 196, 186), (170, 165, 155), (80, 80, 84)
    # Alder Arms: 4-storey brick apartments, taller than the frame
    brick(R, L, 0, 0, 470, 606, (165, 75, 55))
    for x0 in (40, 150, 300, 390):
        win(R, L, x0, 60, x0 + 56, 170); win(R, L, x0, 230, x0 + 56, 340)
    for x0 in (40, 390): win(R, L, x0, 400, x0 + 56, 510)
    R(214, 330, 348, 350, (230, 220, 190))            # ALDER ARMS sign board
    R(230, 360, 334, 580, (120, 70, 45)); R(240, 370, 324, 580, (60, 45, 40))   # entrance
    R(210, 580, 356, 594, (180, 175, 165)); R(196, 594, 370, 606, (170, 165, 155))  # stoop steps
    # Rosa's: two storeys, flat above the shop
    brick(R, L, 480, 90, 1230, 606, (150, 70, 55))
    R(474, 80, 1236, 100, (120, 60, 45))              # parapet cap
    for x0 in (560, 760, 960, 1110):
        win(R, L, x0, 140, x0 + 70, 250, glass=(110, 135, 150))
    R(500, 286, 1210, 350, (40, 95, 100))            # blank shop-name fascia (name drawn in code)
    R(500, 350, 1210, 360, (30, 70, 75))
    R(510, 366, 1040, 590, (50, 100, 105)); R(522, 378, 1028, 578, (240, 236, 210))   # big shop window (lit interior)
    for x in range(560, 1010, 90): R(x, 470, x + 70, 578, (225, 220, 205))            # washers inside
    R(1054, 356, 1166, 606, (50, 100, 105)); R(1066, 368, 1154, 540, (240, 236, 210))  # glass shop door
    R(510, 590, 1040, 606, (120, 110, 100))           # stallriser
    # Corner Cup: two storeys, cornice
    brick(R, L, 1240, 130, 1800, 606, (210, 190, 150), (180, 160, 120))
    R(1234, 116, 1806, 134, (120, 90, 60))
    for x0 in (1300, 1440, 1580, 1700):
        win(R, L, x0, 170, x0 + 64, 270, glass=(110, 135, 150))
    R(1256, 296, 1784, 346, (40, 70, 55))             # CORNER CUP fascia
    R(1262, 366, 1606, 586, (60, 45, 35)); R(1272, 376, 1596, 576, (245, 225, 180))     # café window
    R(1626, 352, 1724, 606, (60, 45, 35)); R(1640, 366, 1710, 540, (245, 225, 180))     # café door
    # Delgado's Market: one and a half storeys
    brick(R, L, 1810, 210, 2140, 606, (170, 60, 50))
    R(1804, 196, 2146, 214, (110, 50, 40))
    R(1826, 250, 2124, 316, (235, 225, 200))          # DELGADO'S sign
    R(1828, 360, 2024, 570, (60, 45, 35)); R(1838, 370, 2014, 560, (240, 220, 170))     # shop window
    R(2036, 352, 2128, 606, (60, 45, 35)); R(2048, 364, 2116, 540, (240, 220, 170))     # door
    # the lot: chain-link fence on a low wall, weeds
    R(2146, 560, 2600, 606, (150, 145, 135))
    for x in range(2160, 2600, 90): R(x, 380, x + 6, 560, (120, 120, 120), None)
    for x in range(2150, 2600, 18): L([(x, 380), (x + 18, 560)], (170, 170, 170), 1); L([(x + 18, 380), (x, 560)], (170, 170, 170), 1)
    L([(2146, 380), (2600, 380)], (120, 120, 120), 3)
    # sidewalk, curb, road
    R(0, 606, WW, 690, SIDE, None)
    for x in range(0, WW, 130): L([(x, 606), (x, 690)], (175, 170, 160), 2)
    R(0, 690, WW, 700, CURB, None)
    R(0, 700, WW, 720, ROAD, None)
    return im

def park():
    WW = 2000
    im, R, E, P, L = canvas(WW, 720)
    # distant treeline
    for i, x in enumerate(range(-40, WW + 80, 110)):
        h = 150 + (i * 37) % 90
        E(x, 330 - h, x + 190, 440, [(110, 140, 70), (150, 150, 60), (190, 120, 50), (90, 125, 70)][i % 4])
    R(0, 400, WW, 520, (130, 165, 80), None)          # lawn
    R(0, 500, WW, 590, (80, 110, 55), None)           # hedge
    for x in range(0, WW, 30): R(x, 470, x + 4, 590, (40, 40, 40), None)   # iron fence
    L([(0, 480), (WW, 480)], (40, 40, 40), 3); L([(0, 560), (WW, 560)], (40, 40, 40), 3)
    # stone fountain in the middle
    R(880, 520, 1120, 606, (190, 185, 175)); R(890, 510, 1110, 530, (120, 170, 190))
    R(975, 420, 1025, 520, (190, 185, 175)); E(930, 400, 1070, 440, (190, 185, 175)); E(985, 360, 1015, 404, (200, 225, 235))
    R(0, 590, WW, 606, (110, 150, 70), None)          # lawn edge
    R(0, 606, WW, 700, (215, 200, 165), None)         # gravel path
    R(0, 700, WW, 720, (120, 160, 75), None)          # grass strip
    return im

def garden():
    WW = 1800
    im, R, E, P, L = canvas(WW, 720)
    brick(R, L, 0, 0, 700, 440, (160, 72, 55))       # back of the Alder Arms
    for x0 in (60, 240, 420, 580):
        win(R, L, x0, 70, x0 + 56, 170); win(R, L, x0, 250, x0 + 56, 350)
    for y in (180, 360):                              # fire escape landings + ladders
        R(200, y, 380, y + 8, (40, 40, 40)); L([(200, y - 60), (380, y - 60)], (40, 40, 40), 2)
    L([(360, 188), (230, 360)], (40, 40, 40), 3)
    brick(R, L, 780, 140, 1320, 440, (175, 90, 65))  # neighbouring building, lower
    R(774, 128, 1326, 146, (120, 60, 45))
    for x0 in (840, 1000, 1160): win(R, L, x0, 200, x0 + 56, 300)
    # wooden fence
    R(0, 420, WW, 600, (150, 110, 70))
    for x in range(0, WW, 40): L([(x, 420), (x, 600)], (120, 85, 55), 2)
    # tool shed
    P([(1390, 330), (1520, 250), (1650, 330)], (160, 70, 50))
    R(1400, 330, 1640, 606, (60, 120, 125)); R(1470, 400, 1570, 606, (45, 95, 100)); R(1460, 346, 1580, 380, (235, 225, 200))
    # clothesline posts
    for x in (100, 1000):
        R(x - 6, 286, x + 6, 610, (110, 80, 55)); R(x - 30, 286, x + 30, 296, (110, 80, 55))
    R(0, 600, WW, 614, (90, 130, 60), None)           # grass edge
    R(0, 614, WW, 700, (150, 115, 80), None)          # packed-earth path
    R(0, 700, WW, 720, (100, 140, 65), None)
    return im

def riverside():
    WW = 1800
    im, R, E, P, L = canvas(WW, 720)
    R(0, 404, WW, 424, (110, 120, 100), None)         # far bank
    R(0, 424, WW, 560, (70, 110, 140), None)          # river
    for y in range(440, 560, 22): L([(0, y), (WW, y)], (100, 140, 165), 1)
    # steel bridge across the right half
    R(980, 250, WW, 276, (70, 80, 95))
    for x in range(1000, WW, 80): L([(x, 170), (x + 40, 250)], (70, 80, 95), 4); L([(x + 80, 170), (x + 40, 250)], (70, 80, 95), 4)
    L([(980, 170), (WW, 170)], (70, 80, 95), 6)
    for x in (1180, 1560): R(x - 24, 276, x + 24, 560, (150, 140, 125))
    # railing along the water, promenade
    L([(0, 520), (WW, 520)], (30, 30, 30), 4); L([(0, 590), (WW, 590)], (30, 30, 30), 3)
    for x in range(0, WW, 24): L([(x, 520), (x, 600)], (30, 30, 30), 2)
    for x in range(0, WW, 180): R(x - 6, 510, x + 6, 606, (30, 30, 30))
    R(0, 600, WW, 616, (160, 150, 130), None)
    R(0, 616, WW, 720, (195, 185, 165), None)
    for x in range(0, WW, 110): L([(x, 616), (x, 720)], (170, 160, 140), 2)
    return im

def skyline():
    im, R, E, P, L = canvas(1600, 480)                # drawn at 2400 x 720 (1.5x of this)
    import random
    rnd = random.Random(7)
    x = 0
    while x < 1600:
        w = rnd.randint(50, 120); h = rnd.randint(120, 300)
        col = rnd.choice([(150, 160, 175), (165, 170, 180), (140, 150, 165), (175, 165, 160)])
        R(x, 480 - h, x + w, 480, col)
        for yy in range(480 - h + 12, 470, 22):
            for xx in range(x + 8, x + w - 10, 16): R(xx, yy, xx + 7, yy + 10, (120, 130, 150), None)
        x += w + rnd.randint(0, 12)
    # the Crestline tower under construction, with a crane
    R(1000, 60, 1110, 480, (120, 170, 200)); R(1000, 60, 1110, 150, (170, 175, 180))
    for yy in range(70, 150, 16): L([(1000, yy), (1110, yy)], (90, 90, 90), 1)
    R(1046, 0, 1054, 60, (220, 170, 40)); L([(960, 12), (1200, 12)], (220, 170, 40), 5)
    return im

def view_shop():
    """What Rosa's front window looks out on: across Linden Street."""
    im, R, E, P, L = canvas(640, 600)
    # across the street: Ferrante's Bakery, Linden Hardware, flats above
    brick(R, L, 0, 60, 330, 470, (175, 95, 70))
    for x0 in (40, 140, 240): win(R, L, x0, 110, x0 + 50, 190)
    R(20, 250, 310, 290, (40, 80, 55))                # FERRANTE'S BAKERY fascia
    P([(10, 290), (320, 290), (300, 330), (30, 330)], (60, 110, 70))   # green awning
    R(30, 336, 220, 452, (245, 220, 170))             # bakery window (bread)
    R(236, 330, 300, 470, (60, 45, 35))               # bakery door
    brick(R, L, 340, 20, 640, 470, (130, 120, 115))
    for x0 in (380, 480, 580): win(R, L, x0, 70, x0 + 50, 150)
    R(360, 240, 630, 282, (150, 60, 45))              # LINDEN HARDWARE fascia
    R(370, 300, 560, 452, (210, 200, 170))            # hardware window
    R(572, 296, 630, 470, (60, 45, 35))
    R(0, 470, 640, 486, (190, 185, 175), None)        # far sidewalk
    R(0, 486, 640, 492, (150, 145, 140), None)        # far curb
    R(0, 492, 640, 560, (85, 85, 90), None)           # road
    for x in range(20, 640, 120): R(x, 524, x + 60, 528, (230, 210, 120), None)
    R(0, 560, 640, 566, (150, 145, 140), None)
    R(0, 566, 640, 600, (200, 196, 186), None)        # near sidewalk
    return im

def view_home():
    """From the flat's window: rooftops, and the Crestline tower going up downtown."""
    im, R, E, P, L = canvas(560, 480)
    R(330, 40, 400, 300, (120, 170, 200)); R(330, 40, 400, 100, (170, 175, 180))   # the tower
    R(362, 0, 368, 40, (220, 170, 40)); L([(300, 8), (470, 8)], (220, 170, 40), 4)  # crane
    for i, x in enumerate(range(0, 560, 60)):
        h = 110 + (i * 53) % 90
        R(x, 300 - h + 60, x + 56, 330, [(160, 165, 175), (150, 155, 170), (170, 165, 165)][i % 3])
    brick(R, L, 0, 300, 220, 480, (165, 80, 60))
    R(40, 250, 110, 300, (140, 110, 80)); P([(36, 250), (75, 222), (114, 250)], (100, 80, 60))  # water tower
    L([(50, 300), (50, 330)], (60, 50, 40), 3); L([(100, 300), (100, 330)], (60, 50, 40), 3)
    brick(R, L, 230, 340, 400, 480, (150, 90, 70))
    R(300, 310, 316, 340, (130, 70, 55))              # chimney
    brick(R, L, 410, 280, 560, 480, (175, 100, 75))
    for x0 in (430, 490): win(R, L, x0, 320, x0 + 36, 380)
    return im

if __name__ == '__main__':
    for name in sys.argv[1:]:
        im = globals()[name]()
        im.save(OUT + f'block_{name}.png'); print(name, im.size)
