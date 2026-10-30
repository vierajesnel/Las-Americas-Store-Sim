"""Sprite test: the Las Americas crew as 16x32 pixel-art characters.

Each character is a hand-placed pixel grid. One letter = one pixel, looked up
in that character's palette ('.' is transparent). Run:

    python3 make_sprites.py

Outputs (next to this script):
    sprites/<name>.png   1x sprite, the real game asset
    lineup.png           everyone in front of the store wall, scaled up
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
W, H = 16, 32

# Colors shared by everyone.
BASE = {
    "K": (27, 20, 32),     # outline
    "E": (30, 22, 34),     # eyes
    "M": (156, 72, 72),    # mouth
    "X": (234, 146, 128),  # blush
    "w": (244, 244, 246),  # white
    "W": (192, 198, 206),  # watch / silver
    "G": (232, 184, 72),   # gold
    "L": (96, 190, 240),   # AT&T blue
}

CHARACTERS = {
    "Matthew": {
        "palette": {
            "S": (222, 168, 128), "s": (190, 130, 98),
            "H": (38, 26, 24), "h": (78, 54, 44), "B": (38, 26, 24),
            "T": (74, 76, 86), "t": (58, 60, 70),
            "P": (64, 98, 150), "p": (48, 76, 120),
            "O": (126, 136, 124), "o": (166, 176, 164),
        },
        "grid": [
            "....KK.KKK.KK...",
            "...KhHKHhHKhHK..",
            "..KhHHHhHHHHhHK.",
            ".KhHHHHHHhHHHHHK",
            ".KHHhHHHHHHHhHHK",
            "KhHHHHhHHHhHHHHK",
            "KHHHHHHHHHHHHHHK",
            "KHHHSHHSHHSHHHHK",
            "KHHSBBSSSSBBSHHK",
            ".KHSSSSSSSSSSHK.",
            ".KSSSESSSSESSSK.",
            ".KSSSESSSSESSSK.",
            "..KsSSSSSSSSsKW.",
            "..KsSSSMMSSSsK..",
            "...KsSSSSSSsK...",
            "....KKssssKK....",
            "...KTTTTTTTTK...",
            "..KTTTTTTTTTTK..",
            "..KTTtLLLLtTTK..",
            "..KTTtLTLLtTTK..",
            "..KSStTTTTtSSK..",
            "..KSStTTTTtWWK..",
            "..KSSKPPPPKSSK..",
            "...KKPPPPPPKK...",
            "....KPPPPPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KpPKKPpK....",
            "...KOOOKKOOOK...",
            "...KOoOKKOoOK...",
            "...KKKKKKKKKK...",
        ],
    },
    "Madai": {
        "palette": {
            "S": (214, 160, 120), "s": (184, 128, 94),
            "H": (26, 20, 24), "h": (64, 50, 58), "d": (14, 10, 14),
            "B": (26, 20, 24), "Y": (246, 204, 84),
            "T": (34, 46, 86), "t": (24, 32, 64),
            "P": (30, 40, 72), "p": (22, 30, 56),
            "O": (44, 44, 50), "o": (96, 96, 106),
        },
        "grid": [
            ".......ww.......",
            "....Y..YY..Y....",
            "...KYYYYYYYYK...",
            "..KHHHHHHHHHHK..",
            ".KHHHhHHHHhHHHK.",
            ".KHHhHHhhHHhHHK.",
            ".KHHHHSSSSHHHHK.",
            ".KHHHSSSSSSHHHK.",
            ".KHHBBSSSSBBHHK.",
            ".KHHSSSSSSSSHHK.",
            ".KHHSESSSSESHHK.",
            ".KHHSESSSSESHHK.",
            ".KHHXSSSSSSXHHK.",
            ".KHGHSMwwMSHGHK.",
            ".KHGHKSSSSKHGHK.",
            ".KHHHHKKKKHHHHK.",
            ".KHHKTGTTGTKHHK.",
            ".KHHTTTGGTTTHHK.",
            ".KHHtTTGGTTtHHK.",
            ".KHhtTLLLLTthHK.",
            "..KHStTLLTtSHK..",
            "..KSStTTTTtSSK..",
            "..KSSKPPPPKwwK..",
            "...KKPPPPPPKK...",
            "....KPPPPPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "...KPPPKKPPPK...",
            "...KpPPKKPPpK...",
            "...KOOOKKOOOK...",
            "...KOoOKKOoOK...",
            "...KKKKKKKKKK...",
        ],
    },
    "Daniela": {
        "palette": {
            "S": (242, 200, 170), "s": (214, 166, 136),
            "H": (146, 96, 54), "h": (200, 150, 94), "d": (112, 72, 40),
            "B": (112, 72, 40), "g": (62, 44, 50), "l": (206, 222, 236),
            "T": (130, 134, 144), "t": (106, 110, 120),
            "P": (150, 180, 214), "p": (120, 150, 190),
            "O": (236, 236, 238), "o": (200, 200, 210),
        },
        "grid": [
            "................",
            "................",
            "....KKKKKKKK....",
            "...KHHHHHHHHK...",
            "..KHHhHHHHhHHK..",
            ".KHHhHHddHHhHHK.",
            ".KHHHHSddSHHHHK.",
            ".KHHHSSSSSSHHHK.",
            ".KHHSSSSSSSSHHK.",
            ".KHHgggSSgggHHK.",
            ".KHHlElgglElHHK.",
            ".KHHlElSSlElHHK.",
            ".KHHgggSSgggHHK.",
            ".KHhHsSMMSsHhHK.",
            ".KHHhKsSSsKhHHK.",
            ".KHhHHKssKHHhHK.",
            ".KHHKTTTTTTKHHK.",
            ".KhHTTTTTTTTHhK.",
            ".KHhtTTLLTTthHK.",
            ".KhHtTLLLLTtHhK.",
            "..KhTtTLLTtThK..",
            "..KTTtTTTTtTTK..",
            "..KSSKPPPPKSSK..",
            "...KKPPPPPPKK...",
            "....KPPPPPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KpPKKPpK....",
            "...KOOOKKOOOK...",
            "...KOoOKKOoOK...",
            "...KKKKKKKKKK...",
        ],
    },
    "Alex": {
        "palette": {
            "S": (226, 180, 140), "s": (196, 148, 112),
            "H": (44, 30, 24), "h": (86, 60, 46), "f": (150, 118, 98),
            "B": (44, 30, 24),
            "T": (36, 48, 80), "t": (26, 34, 60), "z": (124, 144, 176),
            "P": (70, 104, 156), "p": (54, 82, 126),
            "O": (150, 150, 156), "o": (192, 192, 198),
        },
        "grid": [
            "......KKK.......",
            "....KKhhHKK.....",
            "...KHhHHHhHKK...",
            "..KHHHHhHHHHHK..",
            "..KHHhHHHHHhHK..",
            "..KfHHHHHHHHfK..",
            "..KfHHHHhHHHfK..",
            "..KfSHHHSSHSfK..",
            "..KfBBSSSSBBfK..",
            "..KSSSSSSSSSSK..",
            ".KSSSESSSSESSSK.",
            ".KSSSESSSSESSSK.",
            "..KsSSSSSSSSsK..",
            "..KsSSSMMSSSsK..",
            "...KsSSSSSSsK...",
            "....KKssssKK....",
            "...KTTzsszTTK...",
            "..KTTTTzzTTTTK..",
            "..KTTtTTTTtTTK..",
            "..KTTtTTTwtTTK..",
            "..KTTtTTTTtTTK..",
            "..KTTtTTTTtTTK..",
            "..KSSKPPPPKSSK..",
            "...KKPPPPPPKK...",
            "....KPPPPPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KpPKKPpK....",
            "...KOOOKKOOOK...",
            "...KOoOKKOoOK...",
            "...KKKKKKKKKK...",
        ],
    },
    "Nathalya": {
        "palette": {
            "S": (238, 194, 160), "s": (208, 160, 126),
            "H": (96, 62, 40), "h": (140, 96, 62), "B": (96, 62, 40),
            "T": (36, 50, 90), "t": (26, 36, 68),
            "A": (104, 182, 232), "a": (78, 150, 204),
            "P": (32, 30, 36), "p": (54, 52, 60),
            "O": (240, 240, 242), "o": (200, 200, 210),
        },
        "grid": [
            "..................",
            "..................",
            "....KKKKKKKK......",
            "...KHHHhHHHHK.KKK.",
            "..KHHhHHHHHhHKhHHK",
            "..KHHHHHHhHHHAHHhK",
            "..KHHHHHHHHHHAKhHK",
            "..KHHSSSSSSHHKKHHK",
            "..KHBBSSSSBBHKKhHK",
            "..KHSSSSSSSSHKKHHK",
            ".KSSSESSSSESSSKHhK",
            ".KSSSESSSSESSSKhHK",
            "..KsXSSSSSSXsKKHHK",
            "..KsSSSMMSSSsK.KhK",
            "...KsSSSSSSsK..KK.",
            "....KKssssKK......",
            "...KAATTTTAAK.....",
            "..KAATTTTTTAAK....",
            "..KAaTLTTTTaAK....",
            "..KAaTTTTTTaAK....",
            "..KAaTTTTTTaAK....",
            "..KAaTTTTTTaAK....",
            "..KSSKPPPPKSSK....",
            "...KKPPPPPPKK.....",
            "....KPPPPPPK......",
            "....KPPKKPPK......",
            "....KPPKKPPK......",
            "...KPPPKKPPPK.....",
            "..KPPpPKKPpPPK....",
            "..KOOOOKKOOOOK....",
            "..KOoOOKKOOoOK....",
            "..KKKKKKKKKKKK....",
        ],
    },
    "Jesnel": {
        "palette": {
            "S": (214, 170, 136), "s": (184, 138, 106),
            "H": (34, 24, 22), "h": (72, 52, 44), "f": (98, 76, 64),
            "B": (34, 24, 22), "m": (196, 130, 112),
            "T": (178, 182, 190), "t": (152, 156, 166),
            "P": (46, 48, 56), "p": (64, 66, 76),
            "O": (58, 58, 64), "o": (206, 206, 212),
        },
        "grid": [
            "................",
            "....K.KKK.KK....",
            "...KhKHhHKhHK...",
            "..KHhHHHHhHHHK..",
            "..KHHHhHHHHhHK..",
            "..KHhHHHHHHHHK..",
            "..KffHHhHHHffK..",
            "..KfSSSSSSSSfK..",
            "..KSBBBSSBBBSK..",
            "..KSSSSSSSSSSK..",
            ".KSSSESSSSESSSK.",
            ".KSSSESSSSESSSK.",
            "..KsSSSSSSSSsK..",
            "..KsSSmMMmSSsK..",
            "...KsSSSSSSsK...",
            "....KKssssKK....",
            "...KTTTssTTTK...",
            "..KTTTTLTTTTTK..",
            "..KTTwwTTLtTTK..",
            "..KTTLTLTTLTTK..",
            "..KSSLTTTTLSSK..",
            "..KSSLTTTTLSSK..",
            "..KSSKPPPPKSSK..",
            "...KKPPPPPPKK...",
            "....KPPPPPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KPPKKPPK....",
            "....KpPKKPpK....",
            "...KOOOKKOOOK...",
            "...KooOKKOooK...",
            "...KKKKKKKKKK...",
        ],
    },
}


def sprite(name, grid=None):
    data = CHARACTERS[name]
    palette = {**BASE, **data["palette"]}
    grid = grid or data["grid"]
    assert len(grid) == H, f"{name}: {len(grid)} rows"
    width = len(grid[0])
    img = Image.new("RGBA", (width, H), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        assert len(row) == width, f"{name} row {y}: {len(row)} cols"
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), palette[ch] + (255,))
    return img


def idle_frame(name, bob, blink, sparkle):
    """One idle frame: breathing bob (upper body dips 1px), blink, tiara glint."""
    grid = list(CHARACTERS[name]["grid"])
    if bob:
        blank = "." * len(grid[0])
        grid = [blank] + grid[:23] + grid[24:]
    if blink:
        lid = "l" if name == "Daniela" else "S"
        grid = [row.replace("E", lid) if y % 2 == int(bob) else row.replace("E", "K")
                for y, row in enumerate(grid)]
    if sparkle:
        grid = [row.replace("w", "Y") if y < 2 else row for y, row in enumerate(grid)]
    return sprite(name, grid)


def store_wall(width, height):
    """The sales floor backdrop: cyan LED cove, accessory wall, carpet."""
    img = Image.new("RGBA", (width, height), (232, 236, 242, 255))
    d = ImageDraw.Draw(img)
    # ceiling + the LED strip everyone recognizes
    d.rectangle([0, 0, width, 3], fill=(214, 220, 230))
    d.rectangle([0, 4, width, 4], fill=(150, 226, 255))
    d.rectangle([0, 5, width, 5], fill=(40, 200, 255))
    d.rectangle([0, 6, width, 6], fill=(170, 230, 252))
    # accessory wall units
    floor_y = height - 14
    x = 4
    products = [(30, 30, 34), (226, 80, 70), (90, 190, 240), (240, 240, 240),
                (60, 120, 210), (250, 196, 70), (120, 120, 130), (236, 150, 186)]
    i = 0
    while x + 26 < width:
        d.rectangle([x, 10, x + 25, floor_y - 1], fill=(214, 182, 134))
        d.rectangle([x + 1, 11, x + 24, 15], fill=(44, 112, 204))     # sign
        d.rectangle([x + 4, 13, x + 18, 13], fill=(236, 244, 255))   # sign text
        d.rectangle([x + 2, 17, x + 23, floor_y - 2], fill=(236, 226, 206))
        for row_y in (18, 25, 32):                                     # hung products
            for col in range(4):
                c = products[i % len(products)]
                i += 1
                px = x + 3 + col * 5
                d.rectangle([px, row_y, px + 3, row_y + 5], fill=c)
                d.rectangle([px, row_y, px + 3, row_y], fill=(250, 250, 252))
        d.rectangle([x, floor_y - 5, x + 25, floor_y - 1], fill=(190, 156, 108))
        x += 30
    # carpet
    d.rectangle([0, floor_y, width, height], fill=(62, 72, 98))
    for cx in range(0, width, 4):
        for cy in range(floor_y + 1, height, 3):
            img.putpixel((cx + (cy % 2) * 2 if cx + 2 < width else cx, cy), (54, 63, 88, 255))
    return img, floor_y


def lineup(scale=6, sprites=None):
    names = list(CHARACTERS)
    sprites = sprites or {n: sprite(n) for n in names}
    spacing = 24
    width = spacing * len(names) + 8
    height = 64
    scene, floor_y = store_wall(width, height)
    for i, name in enumerate(names):
        spr = sprites[name]
        x = 8 + i * spacing
        y = floor_y + 6 - H
        # little shadow under the feet
        sh = ImageDraw.Draw(scene)
        sh.ellipse([x + 2, floor_y + 4, x + 13, floor_y + 7], fill=(40, 46, 66))
        scene.alpha_composite(spr, (x, y))
    big = scene.resize((width * scale, height * scale), Image.NEAREST)

    label_h = 44
    out = Image.new("RGBA", (big.width, big.height + label_h), (24, 28, 40, 255))
    out.paste(big, (0, 0))
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    d = ImageDraw.Draw(out)
    for i, name in enumerate(names):
        cx = (8 + i * spacing + W // 2) * scale
        tw = d.textlength(name, font=font)
        d.text((cx - tw / 2, big.height + 9), name, font=font, fill=(236, 240, 248))
    return out


if __name__ == "__main__":
    (OUT / "sprites").mkdir(exist_ok=True)
    for name in CHARACTERS:
        sprite(name).save(OUT / "sprites" / f"{name.lower()}.png")
    lineup().save(OUT / "lineup.png")

    # 8-frame idle loop, each character breathing on its own offset
    frames = []
    for t in range(8):
        sprites = {}
        for i, name in enumerate(CHARACTERS):
            phase = (t + i * 3) % 8
            sprites[name] = idle_frame(
                name,
                bob=phase in (2, 3, 4, 5),
                blink=(t + i * 5) % 8 == 6,
                sparkle=t % 4 == 0,
            )
        frames.append(lineup(sprites=sprites).convert("RGB"))
    pal = frames[0].quantize(colors=255)
    gif = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    gif[0].save(OUT / "lineup_idle.gif", save_all=True, append_images=gif[1:],
                duration=180, loop=0)
    print("wrote", OUT / "lineup.png", OUT / "lineup_idle.gif")
