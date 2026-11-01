"""Store map test: the Las Americas sales floor as a 3/4 top-down pixel map.

The store is a long rectangle, drawn sideways:
    left   = back of the store (glass onto the courtyard)
    right  = front (parking lot glass + the entrance, top-right corner)
    top    = accessory wall (the only wall whose face shows in this view)
    bottom = blue TV wall + hallway to the back room

Run:
    python3 make_map.py

Outputs (next to this script):
    store_map.png        1x empty map, the real game asset
    store_labeled.png    2x with every station labeled, for checking the layout
    store_mock.png       3x "gameplay" mock with the crew and some customers
"""

import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from characters import BASE, CREW, CUSTOMER_LOOKS, CUSTOMER_SHAPES  # noqa: E402

W, H = 512, 224
FLOOR_TOP, FLOOR_BOTTOM = 64, 215

WALL = (222, 233, 246)
CEILING = (232, 236, 242)
LED, LED_GLOW, LED_WASH = (52, 206, 255), (150, 226, 255), (196, 228, 250)
WOOD, WOOD_LT, WOOD_DK = (224, 200, 158), (238, 220, 186), (196, 166, 122)
SIGN, SIGN_DK, SIGN_TXT = (76, 150, 228), (56, 120, 198), (244, 248, 255)
PANEL, PANEL_SH = (226, 232, 240), (204, 212, 224)
COUNTER, SHADOW = (248, 248, 246), (150, 160, 178)
GLASS, GLASS_LT, MULLION, FRAME = (186, 218, 236), (214, 236, 248), (236, 240, 244), (120, 128, 138)
PAVEMENT, GRASS = (200, 204, 206), (112, 172, 92)
CARPET, CARPET_LT, CARPET_DK = (72, 82, 102), (84, 94, 116), (62, 70, 90)
FLOOR_SHADOW = (52, 60, 78)
WHITE_TOP, TABLE_EDGE, PLY, HOLE = (246, 247, 249), (206, 210, 218), (226, 206, 168), (196, 200, 208)
DARK, DARK_TIP = (44, 44, 52), (96, 98, 106)
SOFA_TOP, SOFA, SOFA_HI = (78, 80, 90), (52, 54, 62), (104, 106, 116)
CRED_TOP, CRED, CRED_DK = (88, 92, 102), (66, 70, 80), (50, 52, 60)
BLUE_WALL, HALL = (66, 146, 224), (150, 146, 140)
STOOL_BLUE, CHROME = (52, 112, 196), (196, 202, 212)
CANDY, BANNER_BLUE, KIOSK_BLUE, MAT = (210, 40, 60), (70, 156, 230), (64, 160, 236), (58, 60, 68)
RED_SIGN, RED_TXT = (60, 22, 26), (240, 70, 70)

# 3x5 pixel font for signage
FONT = {
    "A": [".#.", "#.#", "###", "#.#", "#.#"], "C": [".##", "#..", "#..", "#..", ".##"],
    "D": ["##.", "#.#", "#.#", "#.#", "##."], "E": ["###", "#..", "##.", "#..", "###"],
    "G": [".##", "#..", "#.#", "#.#", ".##"], "H": ["#.#", "#.#", "###", "#.#", "#.#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"], "N": ["##.", "#.#", "#.#", "#.#", "#.#"],
    "O": [".#.", "#.#", "#.#", "#.#", ".#."], "P": ["##.", "#.#", "##.", "#..", "#.."],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"], "S": [".##", "#..", ".#.", "..#", "##."],
    "T": ["###", ".#.", ".#.", ".#.", ".#."], "U": ["#.#", "#.#", "#.#", "#.#", "###"],
    "X": ["#.#", "#.#", ".#.", "#.#", "#.#"], "$": [".##", "##.", ".#.", ".##", "##."],
    "0": ["###", "#.#", "#.#", "#.#", "###"], "2": ["##.", "..#", ".#.", "#..", "###"],
    "3": ["##.", "..#", ".#.", "..#", "##."], "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "##.", "..#", "##."],
}


def R(d, x, y, w, h, c):
    if w > 0 and h > 0:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def text(d, x, y, s, c):
    for ch in s:
        for gy, row in enumerate(FONT[ch]):
            for gx, px in enumerate(row):
                if px == "#":
                    d.point((x + gx, y + gy), fill=c)
        x += 4


def text_w(s):
    return len(s) * 4 - 1


def floor_shadow(d, x, y, w, h):
    d.ellipse([x, y, x + w - 1, y + h - 1], fill=FLOOR_SHADOW)


# --- walls -----------------------------------------------------------------

def top_wall(d):
    R(d, 0, 0, W, 64, WALL)
    R(d, 0, 0, W, 3, CEILING)
    R(d, 0, 3, W, 1, LED_GLOW)
    R(d, 0, 4, W, 2, LED)
    R(d, 0, 6, W, 2, LED_GLOW)
    R(d, 0, 8, W, 3, LED_WASH)


def back_glass(d):
    """Back half of the accessory-side wall is glass onto the courtyard, plus the side door."""
    R(d, 8, 12, 144, 52, GLASS)
    R(d, 8, 46, 144, 8, PAVEMENT)
    R(d, 8, 54, 144, 10, GRASS)
    R(d, 30, 47, 7, 4, (240, 130, 190))   # the pink toy car outside
    R(d, 31, 51, 2, 1, DARK)
    R(d, 35, 51, 2, 1, DARK)
    for cx in (90, 104):                   # traffic cones
        R(d, cx, 44, 2, 6, (240, 120, 40))
        R(d, cx - 1, 49, 4, 1, (240, 120, 40))
    for i in range(0, 144, 36):            # reflections
        d.line([(8 + i + 4, 60), (8 + i + 20, 14)], fill=GLASS_LT)
    for mx in range(8, 153, 24):
        R(d, mx, 12, 2, 52, MULLION)
    R(d, 8, 12, 144, 2, MULLION)
    # side door (not an entrance)
    R(d, 156, 18, 20, 46, FRAME)
    R(d, 158, 20, 16, 44, GLASS_LT)
    R(d, 158, 40, 16, 2, CHROME)
    R(d, 157, 11, 17, 7, RED_SIGN)
    text(d, 158, 12, "EXIT", RED_TXT)


def unit(d, x, label, kind, rng):
    w = 38
    R(d, x, 12, w, 52, WOOD)
    R(d, x, 12, 1, 52, WOOD_LT)
    R(d, x + w - 1, 12, 1, 52, WOOD_DK)
    R(d, x + 2, 14, w - 4, 9, SIGN)
    R(d, x + 2, 22, w - 4, 1, SIGN_DK)
    if label:
        text(d, x + (w - text_w(label)) // 2, 16, label, SIGN_TXT)
    R(d, x + 3, 25, w - 6, 21, PANEL)
    R(d, x + 3, 25, w - 6, 1, PANEL_SH)

    if kind == "cases":
        colors = [(250, 250, 252), (40, 40, 46), (70, 70, 80), (210, 50, 60),
                  (236, 150, 186), (90, 170, 230), (200, 200, 208)]
        for row_y in (27, 33, 39):
            for col in range(6):
                px = x + 5 + col * 5
                c = rng.choice(colors)
                R(d, px, row_y, 4, 5, c)
                R(d, px, row_y, 4, 1, (252, 252, 252))
    elif kind == "chargers":
        for row_y in (27, 33, 39):
            for col in range(6):
                px = x + 5 + col * 5
                R(d, px, row_y, 4, 5, (238, 240, 244))
                R(d, px, row_y, 4, 1, (90, 170, 230))
                R(d, px + 1, row_y + 2, 2, 2, rng.choice([DARK, (90, 170, 230), DARK]))
    elif kind == "audio":
        R(d, x + 6, 27, 9, 5, (250, 250, 252))          # info card
        R(d, x + 7, 28, 7, 1, (90, 170, 230))
        for sy in (33, 41):
            R(d, x + 3, sy, w - 6, 2, WOOD)
            R(d, x + 3, sy + 1, w - 6, 1, WOOD_DK)
        R(d, x + 9, 29, 6, 4, DARK)                      # speakers
        R(d, x + 22, 37, 7, 4, (60, 40, 40))
        for bx in range(x + 6, x + 32, 4):               # earbud boxes
            R(d, bx, 42, 3, 3, (244, 244, 246))
    elif kind == "internet":                             # the famously empty one
        R(d, x + 4, 27, w - 8, 6, (250, 250, 252))
        R(d, x + 6, 28, 18, 1, (60, 120, 210))
        R(d, x + 6, 30, 22, 1, PANEL_SH)
        R(d, x + 3, 41, w - 6, 2, WOOD)
        R(d, x + 15, 34, 8, 7, (250, 250, 252))           # one lonely gateway
        R(d, x + 14, 40, 10, 1, DARK)
        R(d, x + 18, 36, 2, 1, (120, 120, 130))
    elif kind == "prepaid":
        R(d, x + 14, 26, 9, 7, (250, 250, 252))           # $19.99 card
        R(d, x + 16, 28, 5, 1, DARK)
        R(d, x + 16, 30, 3, 1, (90, 170, 230))
        R(d, x + 3, 33, w - 6, 1, (90, 170, 230))
        for i, px in enumerate(range(x + 6, x + 33, 5)):  # phones
            R(d, px, 34, 3, 4, DARK)
            R(d, px + 1, 35, 1, 2, [(120, 200, 250), (250, 190, 120), (180, 140, 230)][i % 3])
        for col in range(6):                              # chargers
            px = x + 5 + col * 5
            R(d, px, 40, 4, 5, (238, 240, 244) if col % 2 else (52, 52, 60))
    R(d, x + 1, 46, w - 2, 2, COUNTER)
    R(d, x + 2, 48, w - 4, 15, WOOD_LT)
    R(d, x + w // 2, 48, 1, 15, WOOD_DK)
    d.point((x + w // 2 - 3, 51), fill=DARK)
    d.point((x + w // 2 + 3, 51), fill=DARK)
    R(d, x, 63, w, 1, SHADOW)


def poster(d, x, kind):
    if kind == "garantia":
        R(d, x + 1, 16, 22, 47, (100, 112, 142))
        for ly, lw in ((19, 14), (21, 18), (23, 11)):
            R(d, x + 3, ly, lw, 1, (244, 246, 250))
        R(d, x + 6, 30, 3, 3, (210, 160, 120))           # people
        R(d, x + 5, 33, 5, 7, (196, 110, 80))
        R(d, x + 14, 28, 3, 3, (226, 180, 140))
        R(d, x + 13, 31, 5, 9, (60, 80, 70))
        R(d, x + 1, 44, 22, 19, (52, 92, 168))           # pool table
        R(d, x + 6, 48, 2, 2, (250, 250, 250))
        d.ellipse([x + 14, 52, x + 20, 58], outline=(244, 246, 250))
    else:  # $420 promo
        R(d, x + 1, 16, 22, 47, (46, 40, 42))
        text(d, x + 4, 19, "$420", (250, 250, 250))
        R(d, x + 4, 26, 15, 1, (150, 150, 156))
        for i, (hx, c) in enumerate(((5, (60, 100, 170)), (11, (230, 230, 230)), (17, (150, 70, 60)))):
            R(d, x + hx, 33 + i % 2, 3, 3, (220, 170, 130))
            R(d, x + hx - 1, 36 + i % 2, 5, 6, c)
        R(d, x + 2, 44, 20, 9, (130, 86, 54))            # dinner table
        for px in (5, 10, 15):
            R(d, x + px, 46, 3, 2, (246, 246, 246))
        R(d, x + 2, 53, 20, 10, (70, 56, 50))


def side_walls(d):
    for x0 in (0, W - 8):
        R(d, x0, 0, 8, H, GLASS)
        R(d, x0 + 3, 0, 1, H, GLASS_LT)
        for my in range(0, H, 32):
            R(d, x0, my, 8, 1, MULLION)
    R(d, 0, 0, 1, H, FRAME)
    R(d, W - 1, 0, 1, H, FRAME)
    # entrance: front glass, top-right corner
    R(d, W - 8, 66, 8, 2, FRAME)
    R(d, W - 8, 99, 8, 2, FRAME)
    R(d, W - 7, 68, 7, 31, PAVEMENT)
    # OPEN sign on the front glass
    R(d, W - 7, 140, 6, 5, (230, 60, 80))
    R(d, W - 6, 141, 4, 3, (60, 110, 230))


def bottom_wall(d):
    R(d, 0, 216, W, 8, BLUE_WALL)
    R(d, 8, 216, 178, 8, WALL)                           # white AT&T-logo wall at the back
    R(d, 0, 216, W, 1, LED)
    R(d, 186, 216, 26, 8, HALL)                          # hallway to the back room
    R(d, 185, 216, 1, 8, DARK)
    R(d, 212, 216, 1, 8, DARK)


def carpet(d, rng):
    R(d, 0, FLOOR_TOP, W, FLOOR_BOTTOM - FLOOR_TOP + 1, CARPET)
    for ty in range(FLOOR_TOP, FLOOR_BOTTOM + 1, 16):
        for tx in range(8, W - 8, 16):
            tone = rng.choice([CARPET, CARPET, CARPET_LT, CARPET_DK])
            R(d, tx, ty, 16, 16, tone)
            line = tuple(min(255, v + 10) for v in tone)
            if ((tx // 16) + (ty // 16)) % 2:
                for k in range(2, 16, 4):
                    R(d, tx + 1, ty + k, 14, 1, line)
            else:
                for k in range(2, 16, 4):
                    R(d, tx + k, ty + 1, 1, 14, line)
    R(d, 0, FLOOR_TOP, W, 2, FLOOR_SHADOW)


# --- furniture (each returns nothing; drawn in depth order) -----------------

def stool(d, x, y):
    R(d, x + 3, y + 3, 2, 8, CHROME)
    R(d, x + 1, y + 10, 6, 2, CHROME)
    R(d, x, y, 8, 3, WHITE_TOP)
    R(d, x, y + 2, 8, 1, STOOL_BLUE)
    R(d, x + 1, y - 1, 6, 1, STOOL_BLUE)


def client_table(d, x, y):
    """The big table in the back for attending clients."""
    floor_shadow(d, x - 2, y + 26, 84, 8)
    R(d, x, y, 80, 14, WHITE_TOP)
    R(d, x, y + 13, 80, 1, TABLE_EDGE)
    R(d, x, y + 14, 80, 18, WOOD_LT)
    for gx in range(x + 3, x + 78, 6):
        R(d, gx, y + 16, 1, 13, WOOD)
    R(d, x, y + 29, 4, 3, DARK)
    R(d, x + 76, y + 29, 4, 3, DARK)
    R(d, x + 37, y - 6, 6, 9, (250, 250, 252))           # standing sign
    R(d, x + 10, y + 4, 5, 3, CANDY)                     # candy bowl
    R(d, x + 11, y + 7, 3, 1, CANDY)


def demo_table(d, x, y, phone_colors, sign=False):
    w = 56
    floor_shadow(d, x + 2, y + 26, w - 4, 7)
    for lx in (x + 10, x + w - 12):
        for dx in (-6, 6):
            d.line([(lx, y + 14), (lx + dx, y + 30)], fill=WOOD, width=2)
            d.line([(lx + dx * 13 // 16, y + 27), (lx + dx, y + 30)], fill=DARK_TIP, width=2)
    R(d, x, y, w, 12, WHITE_TOP)
    for hx in range(x + 3, x + w - 2, 4):
        for hy in (y + 3, y + 9):
            d.point((hx, hy), fill=HOLE)
    R(d, x, y + 12, w, 3, PLY)
    R(d, x, y + 12, w, 1, TABLE_EDGE)
    spots = [(x + 5 + i * 9, y + 2) for i in range(6)] + [(x + 9 + i * 9, y + 7) for i in range(5)]
    for i, (px, py) in enumerate(spots):
        if sign and i in (5, 9):
            continue
        R(d, px, py + 3, 3, 2, (252, 252, 252))
        R(d, px, py - 2, 3, 5, phone_colors[i % len(phone_colors)])
        R(d, px + 1, py - 1, 1, 3, (150, 200, 240))
    if sign:
        R(d, x + 47, y - 9, 3, 13, WOOD)
        R(d, x + 45, y + 3, 7, 1, DARK)


def pc_podium(d, x, y):
    """Check-in PC: where the line forms."""
    R(d, x, y, 26, 3, WOOD)
    R(d, x, y + 3, 26, 20, (242, 242, 244))
    R(d, x + 25, y + 3, 1, 20, (214, 216, 222))
    R(d, x, y + 22, 26, 1, WOOD_DK)
    R(d, x + 7, y - 12, 13, 10, DARK)                    # monitor
    R(d, x + 8, y - 11, 11, 7, (214, 228, 242))
    R(d, x + 9, y - 8, 4, 1, (60, 140, 220))             # OPUS loading bar (forever)
    R(d, x + 12, y - 2, 3, 2, DARK)
    R(d, x + 1, y - 4, 4, 4, (90, 170, 230))             # brochure holder
    R(d, x + 21, y - 2, 4, 2, DARK)                      # card reader


def attend_desk(d, x, y):
    R(d, x, y, 48, 12, WHITE_TOP)
    R(d, x, y + 12, 48, 1, TABLE_EDGE)
    R(d, x, y + 13, 48, 14, WOOD_LT)
    R(d, x, y + 13, 3, 14, WOOD)
    R(d, x + 45, y + 13, 3, 14, WOOD)
    R(d, x + 30, y + 1, 8, 7, DARK)                      # tablet on its stand
    R(d, x + 31, y + 2, 6, 5, (76, 78, 90))
    R(d, x + 8, y + 3, 5, 3, CANDY)                      # candy bowl
    R(d, x + 9, y + 6, 3, 1, CANDY)
    R(d, x + 9, y + 2, 1, 1, (250, 220, 60))
    d.line([(x + 16, y + 6), (x + 26, y + 9)], fill=(214, 216, 222))  # charging cable


def sofa_back(d, x, y):
    """Backrest, drawn before anyone sitting so they sit in front of it."""
    R(d, x, y - 12, 64, 4, SOFA_TOP)
    R(d, x + 1, y - 11, 62, 1, SOFA_HI)
    R(d, x, y - 8, 64, 9, SOFA)
    for sx in (21, 42):
        R(d, x + sx, y - 8, 1, 9, CRED_DK)


def sofa(d, x, y):
    """Arms and seat cushions, drawn in front of anyone sitting."""
    floor_shadow(d, x - 2, y + 10, 68, 8)
    for ax in (x, x + 57):
        R(d, ax, y - 6, 7, 4, SOFA_TOP)
        R(d, ax + 1, y - 5, 5, 1, SOFA_HI)
        R(d, ax, y - 2, 7, 16, SOFA)
    R(d, x + 7, y, 50, 7, SOFA_TOP)
    R(d, x + 8, y + 1, 48, 1, SOFA_HI)
    for sx in (23, 40):
        R(d, x + sx, y, 1, 7, CRED_DK)
    R(d, x + 7, y + 7, 50, 7, SOFA)
    for lx in (x + 2, x + 59):
        R(d, lx, y + 14, 3, 2, CHROME)


def credenza(d, x, y):
    """TV/Fiber demo cabinet against the blue wall (the TVs are on the wall itself)."""
    R(d, x, y, 64, 4, CRED_TOP)
    R(d, x, y + 4, 64, 12, CRED)
    for dx in (16, 32, 48):
        R(d, x + dx, y + 5, 1, 10, CRED_DK)
    for dx in (14, 18, 46, 50):
        R(d, x + dx, y + 7, 1, 2, CHROME)
    R(d, x + 6, y - 6, 3, 7, (250, 250, 252))            # fiber gateways
    R(d, x + 11, y - 6, 3, 7, (250, 250, 252))
    R(d, x + 22, y - 3, 12, 3, (250, 250, 252))          # brochure stand
    R(d, x + 39, y - 2, 6, 2, DARK)
    R(d, x + 52, y - 5, 7, 5, DARK)                      # DirecTV sign
    R(d, x + 68, y + 3, 9, 13, DARK)                     # speaker
    R(d, x + 69, y + 4, 7, 1, (70, 72, 82))


def fiber_banner(d, x, y):
    R(d, x, y, 10, 1, DARK)
    R(d, x, y + 1, 10, 44, BANNER_BLUE)
    for lx, ly, lh in ((3, 6, 30), (5, 6, 24), (7, 12, 26)):
        R(d, x + lx, y + ly, 1, lh, (244, 248, 255))
    R(d, x - 1, y + 45, 12, 2, DARK)


def kiosk(d, x, y):
    """Vertical TV next to the entrance."""
    R(d, x, y, 14, 26, DARK)
    R(d, x + 1, y + 1, 12, 24, KIOSK_BLUE)
    text(d, x + 2, y + 8, "$35", (250, 250, 252))
    R(d, x + 3, y + 16, 8, 1, (210, 236, 252))
    R(d, x + 3, y + 18, 6, 1, (210, 236, 252))
    R(d, x + 2, y + 26, 1, 12, DARK)
    R(d, x + 11, y + 26, 1, 12, DARK)
    R(d, x, y + 37, 14, 2, DARK)


def door_mat(d):
    R(d, W - 20, 68, 12, 31, MAT)


# --- people ----------------------------------------------------------------

ICONS = {  # need bubbles: what the customer came in for
    "bill": (["..#..", ".####", "#.#..", ".###.", "..#.#", "####."], (60, 160, 80)),
    "phone": (["####", "#bb#", "#bb#", "#bb#", "#bb#", "####"], DARK),
    "internet": ([".#####.", "#.....#", "..###..", ".#...#.", "...#...", "......."], (50, 130, 220)),
    "accessory": ([".###.", "#...#", "#...#", "##.##", "##.##", "....."], (80, 80, 92)),
    "unsure": ([".###.", "#...#", "...#.", "..#..", ".....", "..#.."], (200, 120, 40)),
}
BUBBLE = [
    ".KKKKKKKKK.",
    "KwwwwwwwwwK",
    "KwwwwwwwwwK",
    "KwwwwwwwwwK",
    "KwwwwwwwwwK",
    "KwwwwwwwwwK",
    "KwwwwwwwwwK",
    ".KKKKwwKKK.",
    ".....KwK...",
    "......K....",
]


def paint(grid, palette):
    img = Image.new("RGBA", (len(grid[0]), len(grid)), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), palette[ch] + (255,))
    return img


def crew(name):
    data = CREW[name]
    return paint(data["front"], {**BASE, **data["palette"]})


def customer(look):
    shape, palette = CUSTOMER_LOOKS[look]
    return paint(CUSTOMER_SHAPES[shape]["front"], {**BASE, **palette})


def bubble(img, x, y, icon):
    img.alpha_composite(paint(BUBBLE, {"K": (27, 20, 32), "w": (252, 252, 252)}), (x, y))
    rows, color = ICONS[icon]
    ox = x + (11 - len(rows[0])) // 2
    for gy, row in enumerate(rows):
        for gx, px in enumerate(row):
            if px == "#":
                img.putpixel((ox + gx, y + 1 + gy), color + (255,))
            elif px == "b":
                img.putpixel((ox + gx, y + 1 + gy), (110, 190, 240, 255))


def patience(d, x, y, frac):
    R(d, x, y, 12, 3, (27, 20, 32))
    color = (90, 200, 90) if frac > 0.6 else (240, 200, 60) if frac > 0.3 else (230, 70, 60)
    R(d, x + 1, y + 1, max(1, round(10 * frac)), 1, color)


# --- assembly --------------------------------------------------------------

UNITS = [  # back -> front along the accessory wall
    (184, "unit", "AUDIO", "audio"),
    (222, "poster", None, "garantia"),
    (246, "unit", "CASES", "cases"),
    (284, "unit", "INTERNET", "internet"),
    (322, "unit", "PREPAID", "prepaid"),
    (360, "unit", "CHARGERS", "chargers"),
    (398, "poster", None, "420"),
    (422, "unit", "", "cases"),
    (460, "unit", "CASES", "cases"),
]

IPHONES = [(214, 206, 196), (60, 60, 66), (236, 236, 240), (66, 84, 120)]
SAMSUNGS = [(40, 40, 48), (190, 196, 214), (70, 80, 110)]
PIXELS = [(232, 232, 228), (60, 64, 60), (150, 190, 220), (110, 140, 100)]


def furniture():
    """(base_y, draw(d)) for everything standing on the floor."""
    return [
        (125, lambda d: (stool(d, 28, 113), stool(d, 72, 113))),
        (157, lambda d: client_table(d, 20, 126)),
        (170, lambda d: (stool(d, 28, 158), stool(d, 72, 158))),
        (143, lambda d: demo_table(d, 112, 112, PIXELS)),
        (143, lambda d: demo_table(d, 186, 112, SAMSUNGS, sign=True)),
        (77, lambda d: fiber_banner(d, 136, 32)),
        (209, lambda d: pc_podium(d, 228, 187)),
        (178, lambda d: attend_desk(d, 284, 152)),
        (151, lambda d: sofa_back(d, 356, 152)),
        (167, lambda d: sofa(d, 356, 152)),
        (215, lambda d: credenza(d, 356, 200)),
        (139, lambda d: demo_table(d, 424, 108, IPHONES)),
        (136, lambda d: kiosk(d, 486, 98)),
    ]


def base_map(seed=11):
    rng = random.Random(seed)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    top_wall(d)
    back_glass(d)
    for x, kind, label, style in UNITS:
        if kind == "unit":
            unit(d, x, label, style, rng)
        else:
            poster(d, x, style)
    carpet(d, rng)
    side_walls(d)
    bottom_wall(d)
    door_mat(d)
    return img


def render(people=()):
    """people: (base_y, image, x, y, extras) where extras draws bubbles/bars."""
    img = base_map()
    d = ImageDraw.Draw(img)
    items = [(by, "f", fn) for by, fn in furniture()]
    items += [(by, "p", p) for by, *p in people]
    for _, kind, obj in sorted(items, key=lambda t: t[0]):
        if kind == "f":
            obj(d)
        else:
            spr, x, y, extra = obj
            img.alpha_composite(spr, (x, y))
            if extra:
                extra(img, d, x, y)
    return img


def needs(icon, frac=None):
    def draw(img, d, x, y):
        if frac is not None:
            patience(d, x + 2, y - 4, frac)
        bubble(img, x + 3, y - (16 if frac is not None else 12), icon)
    return draw


def mock_people():
    P = []

    def add(spr, x, y, extra=None):
        P.append((y + spr.height - 1, spr, x, y, extra))

    add(crew("Madai"), 210, 180)                                   # running the check-in PC
    add(customer("senora"), 256, 181, needs("bill", 0.75))         # in line
    add(customer("cap_blue"), 274, 180, needs("phone", 0.45))      # in line
    add(customer("hoodie_green"), 364, 132, needs("internet", 0.2))  # waiting on the sofa
    add(crew("Jesnel"), 36, 104)                                   # attending at the client table
    add(customer("hoodie_purple"), 56, 104)
    add(crew("Nathalya"), 206, 90)                                 # Samsung table
    add(crew("Daniela"), 444, 86)                                  # iPhone table
    add(crew("Alex"), 370, 50)                                     # accessory wall
    add(customer("cap_green"), 392, 52, needs("accessory", 0.9))
    add(crew("Matthew"), 312, 104)                                 # managing, allegedly
    add(customer("cap_red"), 488, 62, needs("unsure"))             # just walked in
    return P


LABELS = [  # (text, x, y) in 1x map coordinates, anchor = center
    ("Entrance", 470, 84), ("iPhone table", 452, 146), ("Vertical TV", 470, 132),
    ("Waiting sofa", 388, 176), ("TV / Fiber demo", 388, 207), ("Attend desk", 308, 144),
    ("Check-in PC (line)", 241, 176), ("Back room", 199, 208),
    ("Samsung table", 214, 150), ("Pixel / Moto table", 140, 98),
    ("Client table", 60, 175), ("Fiber banner", 141, 84), ("Side door (not entrance)", 166, 70),
    ("Accessory wall", 340, 8),
]


def labeled(scale=2):
    img = render().resize((W * scale, H * scale), Image.NEAREST)
    d = ImageDraw.Draw(img, "RGBA")
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
    for label, x, y in LABELS:
        tw = d.textlength(label, font=font)
        cx, cy = x * scale, y * scale
        d.rounded_rectangle([cx - tw / 2 - 5, cy - 9, cx + tw / 2 + 5, cy + 9], 4, fill=(20, 22, 32, 215))
        d.text((cx - tw / 2, cy - 7), label, font=font, fill=(240, 244, 252))
    return img


if __name__ == "__main__":
    render().save(HERE / "store_map.png")
    labeled().save(HERE / "store_labeled.png")
    render(mock_people()).resize((W * 3, H * 3), Image.NEAREST).save(HERE / "store_mock.png")
    print("wrote store_map.png, store_labeled.png, store_mock.png")
