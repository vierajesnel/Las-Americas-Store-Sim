"""Sprite test: the Las Americas crew as 16x32 pixel-art characters.

Each character is a hand-placed pixel grid. One letter = one pixel, looked up
in that character's palette ('.' is transparent). Run:

    python3 make_sprites.py

Outputs (next to this script):
    sprites/<name>.png   1x sprite, the real game asset
    lineup.png           everyone in front of the store wall, scaled up
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
W, H = 16, 32

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from characters import BASE, CREW  # noqa: E402

CHARACTERS = {name: {"palette": e["palette"], "grid": e["front"]} for name, e in CREW.items()}


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
