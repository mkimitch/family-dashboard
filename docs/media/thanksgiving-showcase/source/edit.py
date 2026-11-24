"""Compose the LinkedIn edit from the verified calendar capture. Run with python3."""
import io
import json
import math
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / 'capture/thanksgiving-day'
EXPORT = ROOT / 'exports'
EXPORT.mkdir(exist_ok=True)
SIZE = (1080, 1350)
PAPER = '#f4f1ed'
AMBER = '#efb276'
SOFT = '#bdbcc7'
FPS = 30
SECONDS = 35
IN_POINT = 9
geometry = json.loads((CAPTURE / 'geometry.json').read_text())
dpr = geometry['dpr']
week = Image.open(CAPTURE / 'week.png').convert('RGB')
grid = geometry['grid']
cell = geometry['box']
cx, cy = cell['x'] - grid['x'], cell['y'] - grid['y']
cw, ch = cell['width'], cell['height']
gh = grid['height']
assert week.size == (grid['width'] * dpr, gh * dpr)
font_root = Path('/usr/share/fonts/truetype/noto')


@lru_cache
def font(size, weight):
    return ImageFont.truetype(str(font_root / f'NotoSans-{weight}.ttf'), size)


def text(canvas, xy, value, size, weight='Regular', fill=PAPER):
    ImageDraw.Draw(canvas).text(xy, value, font=font(size, weight), anchor='ls', fill=fill,
                                stroke_width=0)


def tracked(canvas, x, y, value, size=21, fill=SOFT, spacing=2):
    face = font(size, 'Medium')
    for letter in value:
        text(canvas, (x, y), letter, size, 'Medium', fill)
        x += face.getlength(letter) + spacing


def background():
    # Sample the holiday palette into a quiet, continuous copper-to-ink wash.
    small = Image.new('RGB', (216, 270))
    pixels = []
    for y in range(small.height):
        for x in range(small.width):
            glow = math.exp(-((x - 204) / 114) ** 2 - ((y - 180) / 113) ** 2)
            blue = math.exp(-((x - 10) / 155) ** 2 - ((y - 12) / 100) ** 2)
            pixels.append((round(15 + 22 * glow + 4 * blue),
                           round(16 + 9 * glow + 5 * blue),
                           round(24 + 4 * glow + 9 * blue)))
    small.putdata(pixels)
    bg = small.resize(SIZE, Image.Resampling.BICUBIC)
    # Use the project's mark itself, tinted with the same foreground as the type.
    mark = ROOT.parents[2] / 'static/daymark.svg'
    png = subprocess.check_output(['convert', '-background', 'none', '-density', '216',
                                   str(mark), '-resize', '62x62', 'png32:-'])
    mask = Image.open(io.BytesIO(png)).getchannel('A')
    bg.paste(PAPER, (58, 58, 120, 120), mask)
    text(bg, (132, 105), 'Daymark', 47, 'SemiBold')
    tracked(bg, 759, 99, 'NOVEMBER 2026', 22, SOFT, 2.35)
    draw = ImageDraw.Draw(bg)
    draw.line((65, 152, 1015, 152), fill='#494852', width=2)
    draw.line((65, 1213, 1015, 1213), fill='#494852', width=2)
    text(bg, (65, 1275), 'SvelteKit  /  Raspberry Pi 5', 28, 'Medium', SOFT)
    text(bg, (775, 1275), 'Family dashboard', 27, 'Regular', SOFT)
    return bg


base = background()


def copy_layer(shot):
    layer = base.copy()
    if shot == 'intro':
        text(layer, (63, 290), 'Thanksgiving', 92, 'SemiBold')
        text(layer, (65, 389), 'on the calendar.', 89, 'Regular', AMBER)
    elif shot in ('leaves', 'ruffle', 'access'):
        label, lines, body = {
            'leaves': ('CSS ANIMATION', ['Three drifting', 'leaves.'],
                       ['One takes 38 seconds', 'to fall, another 47,', 'and the third 54.']),
            'ruffle': ('CUSTOM SVG', ['Watch the', 'tail feathers.'],
                       ['Once every 34 seconds.']),
            'access': ('DENSITY & MOTION', ['A busier day.', 'Less motion.'],
                       ['Busy days get two leaves.', 'Here, reduced motion', 'keeps them still.'])
        }[shot]
        offset = -136 if shot == 'ruffle' else 0
        tracked(layer, 65, 470 + offset, label, 22, AMBER)
        for index, line in enumerate(lines):
            text(layer, (62, 573 + offset + 78 * index), line, 65, 'SemiBold')
        for index, line in enumerate(body):
            text(layer, (65, 738 + offset + 50 * index), line, 36, fill=SOFT)
    elif shot == 'outro':
        tracked(layer, 65, 234, 'THANKSGIVING EDITION', 23, AMBER)
        text(layer, (60, 358), 'Daymark', 116, 'SemiBold')
        text(layer, (65, 428), 'A family dashboard for Raspberry Pi.', 43, fill=SOFT)
    elif shot == 'cover':
        tracked(layer, 65, 406, 'CUSTOM SVG', 21, AMBER)
        for i, (line, color) in enumerate([('A little', PAPER), ('Thanksgiving', AMBER),
                                          ('magic for', PAPER), ('Daymark.', PAPER)]):
            text(layer, (61, 535 + 86 * i), line, 68, 'SemiBold', color)
        for i, line in enumerate(['Three drifting leaves.', 'One quiet feather ruffle.']):
            text(layer, (65, 918 + 46 * i), line, 32, fill=SOFT)
    return layer


layers = {k: copy_layer(k) for k in ('intro', 'leaves', 'ruffle', 'access', 'outro', 'cover')}


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def mix(a, b, amount):
    return tuple(l + (r - l) * amount for l, r in zip(a, b))


# Source rectangles use CSS pixels. A single scalar maps both axes to the output.
# Each camera state is (source x, y, width, height, screen center x/y, screen width).
wide = (0, 0, 514, gh, 540, 814, 950)
detail = (cx, 0, cw, cy + ch, 781, 684, 452)
inset = (cx + 1, cy + ch - 87, 102, 86, 285, 872, 416)
outro = (0, 0, 514, gh, 540, 822, 950)


def camera(t):
    if t < 5:
        return wide
    if t < 7.6:
        return mix(wide, detail, ease((t - 5) / 2.6))
    if t < 28:
        return detail
    return mix(detail, outro, ease((t - 28) / 2.8))


def copy_at(t):
    current = layers['intro']
    for name, begin, end in [('leaves', 5, 7.6), ('ruffle', 14.8, 16.5),
                             ('access', 21.2, 23), ('outro', 28, 30.8)]:
        if t < begin:
            return current.copy()
        dest = layers[name]
        if t < end:
            fraction = (t - begin) / (end - begin)
            if fraction < .5:
                return Image.blend(current, base, ease(fraction * 2))
            return Image.blend(base, dest, ease(fraction * 2 - 1))
        current = dest
    return current.copy()


@lru_cache(maxsize=32)
def bezel(w, h):
    mask = Image.new('L', (w, h))
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), 10, fill=255)
    return mask


def compose(canvas, shot):
    x, y, w, h, mx, my, sw = shot
    dest = (round(sw), round(sw * h / w))
    box = tuple(v * dpr for v in (x, y, x + w, y + h))
    view = week.resize(dest, Image.Resampling.LANCZOS, box=box, reducing_gap=2)
    left, top = round(mx - dest[0] / 2), round(my - dest[1] / 2)
    canvas.paste(view, (left, top), bezel(*dest))
    ImageDraw.Draw(canvas).rounded_rectangle((left, top, left + dest[0] - 1, top + dest[1] - 1),
                                            10, outline='#53505a', width=2)
    return canvas


def replace_cell(frame):
    week.paste(frame, (cx * dpr, cy * dpr))


def make_cover():
    # Source time zero is already present in the wide screenshot.
    compose(layers['cover'].copy(), detail).save(EXPORT / 'daymark-thanksgiving-cover.png',
                                                optimize=True)


def make_film():
    reduced = Image.open(CAPTURE / 'dense-reduced.png').convert('RGB')
    w, h = cw * dpr, ch * dpr
    assert reduced.size == (w, h)
    reader = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-ss', str(IN_POINT), '-i', str(CAPTURE / 'cell.mkv'),
        '-frames:v', str(FPS * SECONDS), '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'
    ], stdout=subprocess.PIPE)
    out = EXPORT / 'daymark-thanksgiving.mp4'
    partial = out.with_suffix('.partial.mp4')
    writer = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', '1080x1350', '-r', str(FPS), '-i', 'pipe:0', '-an', '-vf',
        'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setsar=1',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-profile:v', 'high',
        '-level', '4.0', '-colorspace', 'bt709', '-color_primaries', 'bt709',
        '-color_trc', 'bt709', '-movflags', '+faststart', '-threads', '4', str(partial)
    ], stdin=subprocess.PIPE)
    try:
        for i in range(FPS * SECONDS):
            raw = reader.stdout.read(w * h * 3)
            if len(raw) != w * h * 3:
                raise RuntimeError(f'Source ended at frame {i}')
            t = i / FPS
            moving = Image.frombytes('RGB', (w, h), raw)
            reduced_mix = ease((t - 21.8) / 0.6) * (1 - ease((t - 29) / 0.6))
            replace_cell(Image.blend(moving, reduced, reduced_mix) if reduced_mix else moving)
            canvas = compose(copy_at(t), camera(t))
            inset_mix = ease((t - 15.6) / 0.8) * (1 - ease((t - 21.2) / 0.65))
            if inset_mix:
                magnified = compose(canvas.copy(), inset)
                canvas = Image.blend(canvas, magnified, inset_mix) if inset_mix < 1 else magnified
            writer.stdin.write(canvas.tobytes())
        writer.stdin.close()
        if writer.wait() or reader.wait():
            raise RuntimeError('FFmpeg failed')
        partial.replace(out)
    finally:
        reader.stdout.close()
        for proc in (reader, writer):
            if proc.poll() is None:
                proc.kill()
                proc.wait()


if __name__ == '__main__':
    make_cover()
    if '--cover-only' not in sys.argv:
        make_film()
