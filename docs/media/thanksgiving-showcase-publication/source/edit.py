"""Compose the review edit using the original showcase palette, mark, and type."""
import io
import json
import math
import subprocess
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / 'capture'
REVIEW = ROOT / 'review'
FILM = REVIEW / 'thanksgiving-comes-to-daymark-draft.mp4'
COVER = REVIEW / 'thanksgiving-comes-to-daymark-cover-draft.png'
SIZE = (1080, 1350)
FPS = 30
FRAMES = 36 * FPS
PAPER, AMBER, SOFT = '#f4f1ed', '#efb276', '#bdbcc7'
LANCZOS = Image.Resampling.LANCZOS


@lru_cache
def font(size, weight):
    return ImageFont.truetype(f'/usr/share/fonts/truetype/noto/NotoSans-{weight}.ttf', size)


def text(image, xy, words, size, weight='Regular', fill=PAPER):
    ImageDraw.Draw(image).text(xy, words, font=font(size, weight), fill=fill, anchor='ls')


def mark(image, xy, size):
    data = subprocess.check_output([
        'convert', '-background', 'none', '-density', '288', str(ROOT.parents[2] / 'static/daymark.svg'),
        '-resize', f'{size}x{size}', 'png32:-'
    ])
    mask = Image.open(io.BytesIO(data)).getchannel('A')
    image.paste(PAPER, (*xy, xy[0] + size, xy[1] + size), mask)


def backgrounds():
    wash = Image.new('RGB', (216, 270))
    pixels = []
    for y in range(wash.height):
        for x in range(wash.width):
            copper = math.exp(-((x - 204) / 114) ** 2 - ((y - 180) / 113) ** 2)
            blue = math.exp(-((x - 10) / 155) ** 2 - ((y - 12) / 100) ** 2)
            pixels.append((round(15 + 22 * copper + 4 * blue), round(16 + 9 * copper + 5 * blue),
                           round(24 + 4 * copper + 9 * blue)))
    wash.putdata(pixels)
    base = wash.resize(SIZE, Image.Resampling.BICUBIC)
    draw = ImageDraw.Draw(base)
    draw.line((58, 151, 1022, 151), fill='#494852', width=2)
    draw.line((58, 1159, 1022, 1159), fill='#494852', width=2)
    text(base, (58, 1206), 'Family dashboard', 30, 'Medium', SOFT)
    text(base, (775, 105), 'November 2026', 32, fill=SOFT)
    end = base.copy()
    mark(end, (60, 213), 119)
    text(end, (201, 313), 'Daymark', 102, 'SemiBold')
    mark(base, (52, 57), 65)
    text(base, (129, 106), 'Daymark', 47, 'SemiBold')
    intro = base.copy()
    text(intro, (54, 281), 'Thanksgiving', 94, 'SemiBold')
    text(intro, (56, 383), 'Comes to Daymark', 88, fill=AMBER)
    pullback = base.copy()
    text(pullback, (56, 239), 'Custom SVG with', 53, 'Medium')
    text(pullback, (56, 306), 'reduced-motion support.', 53, 'Medium', AMBER)
    cover = base.copy()
    text(cover, (54, 551), 'Thanksgiving', 67, 'SemiBold')
    text(cover, (54, 635), 'Comes to', 70, fill=AMBER)
    text(cover, (54, 719), 'Daymark', 70, fill=AMBER)
    return base, intro, pullback, end, cover


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def mix(a, b, t):
    return tuple(x + (y - x) * ease(t) for x, y in zip(a, b))


class Edit:
    def __init__(self):
        info = json.loads((CAPTURE / 'geometry.json').read_text())
        wide, cell = info['wide'], info['box']
        self.scale = info['cellScale']
        self.cell_size = cell['width'] * self.scale, cell['height'] * self.scale
        w, h = wide['width'], wide['height']
        self.plate = Image.open(CAPTURE / 'wide.png').convert('RGB').resize(
            (w * self.scale, h * self.scale), LANCZOS)
        x = cell['x'] - wide['x']
        y = cell['y'] - wide['y']
        self.cell_origin = (x * self.scale, y * self.scale)
        # Source rectangle (CSS px), output center (px), output width (px).
        self.wide = (0, 0, w, h, 540, 786, 1016)
        self.day = (x, 0, cell['width'], h, 540, 653, 470)
        lower = info['turkey']['y'] - wide['y'] - 84
        self.detail = (x, lower, cell['width'], h - lower, 540, 680, 732)
        self.cover = (x, 0, cell['width'], h, 776, 666, 464)
        self.base, self.intro, self.pullback, self.end, self.cover_base = backgrounds()

    def camera(self, t):
        if t < 5:
            return self.wide
        if t < 10.1:
            return mix(self.wide, self.day, (t - 5) / 3)
        if t < 26:
            return mix(self.day, self.detail, (t - 10.1) / 1.9)
        return mix(self.detail, self.wide, (t - 26) / 6)

    def background(self, t):
        if t < 6:
            return Image.blend(self.intro, self.base, ease((t - 5) / 1))
        if t < 30.9:
            return Image.blend(self.base, self.pullback, ease((t - 26) / .65))
        return Image.blend(self.pullback, self.end, ease((t - 30.9) / 1.1))

    def compose(self, frame, background, camera):
        self.plate.paste(frame, self.cell_origin)
        x, y, w, h, mx, my, sw = camera
        size = round(sw), round(sw * h / w)
        box = tuple(v * self.scale for v in (x, y, x + w, min(y + h, self.plate.height / self.scale)))
        view = self.plate.resize(size, LANCZOS, box=box, reducing_gap=2)
        left, top = round(mx - size[0] / 2), round(my - size[1] / 2)
        canvas = background.copy()
        mask = Image.new('L', size)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0]-1, size[1]-1), 12, fill=255)
        canvas.paste(view, (left, top), mask)
        ImageDraw.Draw(canvas).rounded_rectangle(
            (left, top, left+size[0]-1, top+size[1]-1), 12, outline='#53505a', width=2)
        return canvas


def render():
    edit = Edit()
    REVIEW.mkdir(exist_ok=True)
    reader = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-xerror', '-i', str(CAPTURE / 'cell.mkv'),
        '-frames:v', str(FRAMES), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-threads', '2', 'pipe:1'
    ], stdout=subprocess.PIPE)
    partial = FILM.with_suffix('.partial.mp4')
    writer = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1350',
        '-r', str(FPS), '-i', 'pipe:0', '-an', '-vf',
        'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setsar=1',
        '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-profile:v', 'high', '-level', '4.0',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-movflags', '+faststart', '-threads', '4', str(partial)
    ], stdin=subprocess.PIPE)
    try:
        for i in range(FRAMES):
            n = math.prod(edit.cell_size) * 3
            data = reader.stdout.read(n)
            if len(data) != n:
                raise ValueError(f'Source ended at frame {i}')
            frame = Image.frombytes('RGB', edit.cell_size, data)
            if i == 0:
                edit.compose(frame, edit.cover_base, edit.cover).save(COVER.with_suffix('.partial.png'), optimize=True)
            t = i / FPS
            writer.stdin.write(edit.compose(frame, edit.background(t), edit.camera(t)).tobytes())
        writer.stdin.close()
        if writer.wait() or reader.wait():
            raise RuntimeError('FFmpeg failed')
        partial.replace(FILM)
        COVER.with_suffix('.partial.png').replace(COVER)
    finally:
        for proc in (reader, writer):
            if proc.poll() is None:
                proc.kill()
                proc.wait()


if __name__ == '__main__':
    render()
