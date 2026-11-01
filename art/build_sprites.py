"""Build walk-cycle sprite sheets for the crew and the customers.

Each sheet is 4 columns x 3 rows of 20x32 frames:

    row 0  facing down   idle, step (left foot up), step (right foot up), blink
    row 1  facing up     idle, step, step, idle
    row 2  facing right  idle, stride, stride (legs swapped), blink

Facing left is the right-facing row flipped in the game. A walk cycle plays
columns 0,1,0,2 of a row.

Run:
    python3 build_sprites.py

Outputs:
    ../game/public/assets/sprites/crew_<name>.png
    ../game/public/assets/sprites/cust_<look>.png
    walk_preview.gif     everyone walking in all four directions
"""

from pathlib import Path

from PIL import Image

from characters import BASE, CREW, CUSTOMER_LOOKS, CUSTOMER_SHAPES

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "game" / "public" / "assets" / "sprites"
FRAME_W, FRAME_H, OFFSET_X = 20, 32, 2

# Shared side-view body, facing right. Q/q = near/far leg, Z/z = near/far shoe,
# U/F = upper arm/forearm (filled with the character's sleeve colors).
SIDE_TORSO = [
    ".....KTTTTK.....",
    "....KTTTTTTK....",
    "....KtTTTTTK....",
    "....KtTTTTTK....",
    "....KtTTTTTK....",
    "....KtTTTTTK....",
    "....KQQQQQQK....",
    "....KQQQQQQK....",
]
SIDE_LEGS_STAND = [
    ".....KQQQQK.....",
    ".....KQQqQK.....",
    ".....KQQqQK.....",
    ".....KQQqQK.....",
    ".....KQQqQK.....",
    ".....KZZZZZK....",
    ".....KZzZZZK....",
    ".....KKKKKKK....",
]
SIDE_LEGS_STRIDE = [
    ".....KQQQQK.....",
    "....KqqKQQK.....",
    "...KqqK.KQQK....",
    "...KqqK.KQQK....",
    "..KqqK...KQQK...",
    "..KzzzK..KZZZZK.",
    "..KzzzK..KZZZZK.",
    "..KKKKK..KKKKKK.",
]


def overlay(rows, over, start):
    """Draw `over` onto `rows` from row `start`; '.' in `over` keeps what's there."""
    rows = list(rows)
    for i, orow in enumerate(over):
        base = list(rows[start + i].ljust(len(orow), "."))
        for c, ch in enumerate(orow):
            if ch != ".":
                base[c] = ch
        rows[start + i] = "".join(base)
    return rows


def back_body(front):
    """The front body with the chest details (logos, badge, necklace, collar) removed."""
    rows = [list(r) for r in front[16:]]
    for i, row in enumerate(rows):
        r = 16 + i
        if r > 21:
            break
        for c, ch in enumerate(row):
            if 6 <= c <= 9 and (ch in "LGwzMt" or (r <= 17 and ch == "s")):
                row[c] = "T"
            elif 4 <= c <= 11 and ch in "wG":
                row[c] = "T"
    return ["".join(r) for r in rows]


def side_body(pose, opts):
    """pose: 'stand', 'strideA' (near leg forward) or 'strideB' (near leg back)."""
    legs = SIDE_LEGS_STAND if pose == "stand" else SIDE_LEGS_STRIDE
    if pose == "strideB":
        swap = str.maketrans("QqZz", "qQzZ")
        legs = [r.translate(swap) for r in legs]
    rows = [list(r) for r in SIDE_TORSO + legs]
    shift = {"stand": 0, "strideA": -1, "strideB": 1}[pose]  # arm swings opposite the near leg

    def put(r, c, s):
        for i, ch in enumerate(s):
            rows[r - 16][c + i] = ch

    put(18, 6, "KUUK")
    put(19, 6, "KUUK")
    put(20, 6 + shift, "KFFK")
    put(21, 6 + shift, "KFFK")
    put(22, 6 + shift, "KSSK")
    put(23, 7 + shift, "KK")

    skin_from = opts.get("skin_legs_from", 99)
    out = []
    for i, row in enumerate(rows):
        r = 16 + i
        near, far = ("S", "s") if r >= skin_from else ("P", "p")
        table = str.maketrans({"U": opts["upper"], "F": opts["fore"], "Q": near, "q": far, "Z": "O", "z": "o"})
        out.append("".join(row).translate(table))
    return out


def lift(rows, half):
    """Walk step for front/back views: one foot comes up a pixel."""
    rows = [list(r) for r in rows]
    width = len(rows[0])
    cols = range(0, 8) if half == "left" else range(8, width)
    for r in range(26, 31):
        for c in cols:
            rows[r][c] = rows[r + 1][c]
    for c in cols:
        rows[31][c] = "."
    return ["".join(r) for r in rows]


def blink(rows):
    """Close the eyes: top eye row takes the color beside it, bottom row becomes a lash line."""
    eye_rows = [i for i, r in enumerate(rows) if "E" in r]
    if not eye_rows:
        return list(rows)
    out = [list(r) for r in rows]
    for i in eye_rows:
        for c, ch in enumerate(rows[i]):
            if ch == "E":
                out[i][c] = rows[i][c - 1] if i == eye_rows[0] else "K"
    return ["".join(r) for r in out]


def views(entry):
    """All 12 frames of a character as row grids, in sheet order."""
    front = entry["front"]
    back = entry["back_head"] + back_body(front)
    if entry.get("back_over"):
        back = overlay(back, entry["back_over"], 16)

    def side(pose):
        rows = entry["side_head"] + side_body(pose, entry["side"])
        if entry.get("side_over"):
            rows = overlay(rows, entry["side_over"], 16)
        return rows

    side_stand = side("stand")
    return [
        front, lift(front, "left"), lift(front, "right"), blink(front),
        back, lift(back, "left"), lift(back, "right"), back,
        side_stand, side("strideA"), side("strideB"), blink(side_stand),
    ]


def paint(rows, palette):
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((OFFSET_X + x, y), palette[ch] + (255,))
    return img


def sheet(entry, palette):
    frames = [paint(rows, palette) for rows in views(entry)]
    img = Image.new("RGBA", (FRAME_W * 4, FRAME_H * 3), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        img.alpha_composite(f, ((i % 4) * FRAME_W, (i // 4) * FRAME_H))
    return img, frames


def all_sheets():
    """{key: (sheet image, frames)} for every crew member and customer look."""
    out = {}
    for name, entry in CREW.items():
        out[f"crew_{name.lower()}"] = sheet(entry, {**BASE, **entry["palette"]})
    for look, (shape, palette) in CUSTOMER_LOOKS.items():
        out[f"cust_{look}"] = sheet(CUSTOMER_SHAPES[shape], {**BASE, **palette})
    return out


def preview(sheets, scale=4):
    """Everyone walking: one column per character, rows = down, right, up, left."""
    keys = list(sheets)
    cell_w, cell_h = FRAME_W + 4, FRAME_H + 4
    cycle = [0, 1, 0, 2]
    gif = []
    for t in range(4):
        img = Image.new("RGBA", (cell_w * len(keys), cell_h * 4), (72, 82, 102, 255))
        for col, key in enumerate(keys):
            frames = sheets[key][1]
            for row, (base, flip) in enumerate(((0, False), (8, False), (4, False), (8, True))):
                f = frames[base + cycle[t]]
                if flip:
                    f = f.transpose(Image.FLIP_LEFT_RIGHT)
                img.alpha_composite(f, (col * cell_w + 2, row * cell_h + 2))
        gif.append(img.resize((img.width * scale, img.height * scale), Image.NEAREST).convert("RGB"))
    pal = gif[0].quantize(colors=255)
    gif = [g.quantize(palette=pal, dither=Image.Dither.NONE) for g in gif]
    gif[0].save(HERE / "walk_preview.gif", save_all=True, append_images=gif[1:], duration=160, loop=0)


def export_icons():
    """Home-screen icons: Madai (crown and all) on store blue with the LED strip."""
    icons = HERE.parent / "game" / "public" / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    entry = CREW["Madai"]
    figure = paint(entry["front"], {**BASE, **entry["palette"]})
    for size in (192, 512):
        img = Image.new("RGBA", (size, size), (34, 46, 86, 255))
        unit = size // 48
        img.paste((52, 206, 255, 255), (0, unit * 5, size, unit * 6))
        scale = size * 5 // 6 // FRAME_H
        big = figure.resize((FRAME_W * scale, FRAME_H * scale), Image.NEAREST)
        img.alpha_composite(big, ((size - big.width) // 2, size - big.height - unit * 2))
        img.save(icons / f"icon-{size}.png")


if __name__ == "__main__":
    export_icons()
    OUT.mkdir(parents=True, exist_ok=True)
    sheets = all_sheets()
    for key, (img, _) in sheets.items():
        img.save(OUT / f"{key}.png")
    preview(sheets)
    print(f"wrote {len(sheets)} sheets to {OUT} and walk_preview.gif")
