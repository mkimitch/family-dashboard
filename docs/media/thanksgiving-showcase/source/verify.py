"""Check the exported files and measure the ruffle in decoded source and edit frames."""
import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
capture = root / 'capture/thanksgiving-day'
source = capture / 'cell.mkv'
movie = root / 'exports/daymark-thanksgiving.mp4'
cover = root / 'exports/daymark-thanksgiving-cover.png'


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-count_packets', '-show_streams', '-show_format',
        '-of', 'json', str(path)
    ]))


def feather_mask(path, time, box):
    data = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-ss', str(time), '-i', str(path), '-frames:v', '1',
        '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'
    ])
    region = Image.open(io.BytesIO(data)).convert('RGB').crop(box)
    # The light copper feather is flat-filled. Its outline moves during the
    # ruffle while the glow behind it only changes opacity.
    rgb = (236, 171, 87)
    return Image.frombytes('L', region.size, bytes(
        255 if all(abs(value - target) <= 9 for value, target in zip(pixel, rgb)) else 0
        for pixel in region.getdata()
    ))


def ruffle(path, times, box):
    before, peak, settled = (feather_mask(path, t, box) for t in times)
    moved = ImageChops.difference(before, peak).histogram()[255]
    residual = ImageChops.difference(before, settled).histogram()[255]
    assert moved > 220 and residual < moved * .25, (path, moved, residual)
    return {'pixels_changed_at_peak': moved, 'pixels_changed_after_return': residual}


if __name__ == '__main__':
    master = probe(source)
    stream = master['streams'][0]
    assert (stream['width'], stream['height']) == (688, 1300)
    assert int(stream['nb_read_packets']) == 1860 and float(master['format']['duration']) == 62
    video = probe(movie)
    assert len(video['streams']) == 1
    stream = video['streams'][0]
    assert (stream['width'], stream['height']) == (1080, 1350)
    assert stream['codec_name'] == 'h264' and stream['pix_fmt'] == 'yuv420p'
    assert stream['sample_aspect_ratio'] == '1:1' and stream['avg_frame_rate'] == '30/1'
    assert int(stream['nb_read_packets']) == 1050 and float(video['format']['duration']) == 35
    with Image.open(cover) as png:
        assert png.format == 'PNG' and png.size == (1080, 1350)
        png.verify()
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(movie), '-f', 'null', '-'],
                   check=True)
    hashes = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(source), '-vf', 'crop=240:1280:440:8',
        '-f', 'framemd5', '-'
    ], text=True)
    frames = [line.rsplit(',', 1)[1].strip() for line in hashes.splitlines()
              if line and not line.startswith('#')]
    assert len(frames) == 1860
    distinct = len(set(frames))
    assert distinct >= 1800, distinct
    result = {
        'source_seconds': 62, 'source_frames': len(frames), 'distinct_leaf_frames': distinct,
        'source_ruffle': ruffle(source, (27, 28, 29.4), (20, 1004, 229, 1208)),
        'movie_ruffle': ruffle(movie, (18, 19, 20.4), (90, 752, 300, 954)),
        'movie_seconds': 35, 'movie_frames': 1050, 'movie_fps': 30,
        'movie_bytes': movie.stat().st_size, 'cover_bytes': cover.stat().st_size
    }
    (capture / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
