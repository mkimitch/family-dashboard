"""Decode the deliverables, compare the gestures and audit every foliage frame."""
import io
import json
import struct
from itertools import groupby
import subprocess

from PIL import Image, ImageChops, ImageDraw, ImageStat

from edit import CAPTURE, COVER, FILM, FRAMES, FPS, SIZE, Edit


def output(*args):
    return subprocess.check_output(args)


def probe(path):
    return json.loads(output('ffprobe', '-v', 'error', '-count_frames', '-show_streams',
                             '-show_format', '-of', 'json', str(path)))


def frame_at(path, frame):
    # Seek inside a GOP, select the exact presentation frame after accurate seek.
    png = output('ffmpeg', '-v', 'error', '-ss', str(frame // FPS), '-i', str(path),
                 '-vf', f'select=eq(n\\,{frame % FPS})',
                 '-frames:v', '1', '-c:v', 'png', '-threads', '1', '-f', 'image2pipe', '-')
    return Image.open(io.BytesIO(png)).convert('RGB')


def differences(a, b):
    return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3


def color_mask(image, color, tolerance):
    bands = [channel.point(lambda p: 255 if abs(p-c) <= tolerance else 0)
             for channel, c in zip(image.split(), color)]
    return ImageChops.darker(bands[0], ImageChops.darker(bands[1], bands[2]))


def fast_start():
    types = []
    with FILM.open('rb') as f:
        while data := f.read(8):
            size, atom = struct.unpack('>I4s', data)
            assert size >= 8
            types.append(atom)
            f.seek(size - 8, 1)
    return types.index(b'moov') < types.index(b'mdat')


def frame_hashes(path, filters):
    data = output('ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-vf', filters,
                  '-pix_fmt', 'rgb24', '-threads', '2', '-f', 'framemd5', '-')
    return [s.split(b',')[-1].strip() for s in data.splitlines() if s and not s.startswith(b'#')]


def encoded_leaves(edit):
    # In fixed-camera holds these patches contain only the cell and drifting foliage.
    # Check the longest identical run to allow quantization of subpixel motion.
    longest = {}
    for begin, end in [(0, 150), (360, 780), (960, 1080)]:
        x, y, w, h, mx, my, sw = edit.camera(begin / FPS)
        scale = sw / w
        ox, oy = edit.cell_origin
        cw, ch = edit.cell_size
        x0 = ox/edit.scale + .64*cw/edit.scale
        x1 = ox/edit.scale + .98*cw/edit.scale
        y0 = max(y, oy/edit.scale) + 3
        y1 = (oy+ch)/edit.scale - 3
        left = int(mx-sw/2 + (x0-x)*scale)
        top = int(my-h*scale/2 + (y0-y)*scale)
        filters = (f'trim=start_frame={begin}:end_frame={end},'
                   f'crop={int((x1-x0)*scale)}:{int((y1-y0)*scale)}:{left}:{top}')
        hashes = frame_hashes(FILM, filters)
        assert len(hashes) == end-begin
        duration = max(sum(1 for _ in group) for _,group in groupby(hashes))
        assert duration <= 3
        if end == FRAMES:
            assert hashes[-1] != hashes[-2]
        longest[str(begin)] = duration
    return longest


def verify_outlines(edit):
    # Project measured browser paths into the exact camera rectangle and compare with
    # the red wattle in decoded YUV frames, including the pose with only its parent moving.
    samples = json.loads((CAPTURE / 'poses.json').read_text())
    result = []
    rest_feet = samples[0]['feet']
    for pose in samples:
        assert pose['feet'] == rest_feet
        ms, delay = pose['ms'], pose['delay']
        assert delay == (408 if pose['label'] == 'Head tilt' else 504)
        assert pose['duration'] == 450
        active = delay < ms < delay + 450
        assert (pose['actual'] != pose['still']) == active
        t = pose['frame'] / FPS
        x, y, w, h, mx, my, sw = edit.camera(t)
        scale = sw / w
        def project(points):
            return [(mx-sw/2 + ((px+edit.cell_origin[0])/edit.scale-x)*scale,
                     my-scale*h/2 + ((py+edit.cell_origin[1])/edit.scale-y)*scale) for px, py in points]
        moving, neutral = project(pose['actual']), project(pose['still'])
        xs, ys = zip(*(moving + neutral))
        box = int(min(xs))-3, int(min(ys))-3, int(max(xs))+4, int(max(ys))+4
        region = frame_at(FILM, pose['frame']).crop(box)
        observed = color_mask(region, (182, 78, 54), 16)
        def overlap(points):
            mask = Image.new('L', region.size)
            ImageDraw.Draw(mask).polygon([(px-box[0], py-box[1]) for px, py in points], fill=255)
            return (ImageChops.darker(mask, observed).histogram()[255] /
                    ImageChops.lighter(mask, observed).histogram()[255])
        actual, still = overlap(moving), overlap(neutral)
        # At phone-scale framing the thin red path includes anti-aliased and 4:2:0 edge pixels.
        # Require majority intersection-over-union and a measurable lead over the rigid control.
        assert actual > .5, (pose['label'], ms, actual)
        if active:
            assert actual - still > .04, (pose['label'], ms, actual, still)
        result.append((pose['frame'], round(actual, 3), round(still, 3)))
    return result


def run_checks():
    source = CAPTURE / 'cell.mkv'
    geometry = json.loads((CAPTURE / 'geometry.json').read_text())
    video = probe(FILM)
    assert len(video['streams']) == 1
    stream, = video['streams']
    assert (stream['codec_name'], stream['pix_fmt']) == ('h264', 'yuv420p')
    assert (stream['width'], stream['height']) == SIZE
    assert stream['avg_frame_rate'] == stream['r_frame_rate'] == '30/1'
    assert stream['sample_aspect_ratio'] == '1:1'
    assert all(stream[k] == 'bt709' for k in ('color_space', 'color_transfer', 'color_primaries'))
    assert float(video['format']['duration']) == 36 and int(stream['nb_read_frames']) == FRAMES
    assert fast_start()
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(FILM), '-f', 'null', '-'], check=True)
    with Image.open(COVER) as png:
        assert png.format == 'PNG' and png.size == SIZE
        png.verify()
    edit = Edit()
    # The right third of Thursday contains foliage, away from the turkey.
    w, h = edit.cell_size
    leaf_frames = frame_hashes(source, f'crop={w//3}:{h-16}:{w-w//3-4}:8')
    assert len(leaf_frames) == geometry['frames']
    assert all(a != b for a, b in zip(leaf_frames[:FRAMES-1], leaf_frames[1:FRAMES]))
    clips = {}
    for cue in geometry['cues']:
        length = max(a['duration'] + a['delay'] for a in cue['timings'])
        slug = cue['label'].lower().replace(' ', '-')
        clip = CAPTURE / (slug + '.mkv')
        # Hash full RGB frames to check lossless extraction and resting handles.
        clip_hashes = frame_hashes(clip, 'null')
        assert len(clip_hashes) == 36 + (length * FPS + 999) // 1000
        start = cue['frame'] - 18
        assert clip_hashes == frame_hashes(source, f'trim=start_frame={start}:end_frame={start+len(clip_hashes)}')
        clips[slug] = len(clip_hashes)

    # Project the turkey's native SVG bounds into the locked detail shot.
    x, y, width, height, mx, my, sw = edit.detail
    scale = sw / width
    art, wide = geometry['turkey'], geometry['wide']
    tx = mx - sw / 2 + (art['x'] - wide['x'] - x) * scale
    ty = my - scale * height / 2 + (art['y'] - wide['y'] - y) * scale
    aw, ah = art['width'] * scale, art['height'] * scale

    def region(x0, y0, x1, y1):
        return (round(tx + aw*x0/132), round(ty + ah*y0/114),
                round(tx + aw*x1/132), round(ty + ah*y1/114))

    bird = region(0, 0, 132, 114)
    feet = region(54, 104, 97, 113)
    face = region(99, 10, 132, 114)
    contacts, feet_masks, pose_images = {}, [], []
    for label, offset in [('rest', 0), ('first', 16), ('lift', 19), ('second', 24), ('recovered', 39)]:
        i = 22 * FPS + offset
        actual = frame_at(FILM, i)
        captured = frame_at(source, i)
        expected = edit.compose(captured, edit.background(i/FPS), edit.camera(i/FPS))
        error = differences(actual.crop(bird), expected.crop(bird))
        assert error < 4, (label, error)
        beak = color_mask(actual.crop(face), (237, 183, 94), 18).getbbox()
        assert beak
        contacts[label] = beak[3] + face[1]
        feet_masks.append(color_mask(actual.crop(feet), (211, 145, 73), 19))
        pose_images.append(actual.crop(bird))
    assert contacts['first'] > contacts['second'] > contacts['lift'] > contacts['rest']
    assert abs(contacts['recovered'] - contacts['rest']) <= 2
    assert contacts['first'] - contacts['lift'] > ah * .18
    first_foot = feet_masks[0].getbbox()
    assert first_foot
    for mask in feet_masks:
        assert max(abs(a-b) for a,b in zip(first_foot, mask.getbbox())) <= 2
    strip = Image.new('RGB', (pose_images[0].width * len(pose_images), pose_images[0].height))
    for j, image in enumerate(pose_images):
        strip.paste(image, (j*image.width, 0))
    strip.save(CAPTURE / 'encoded-double-peck.png')

    # Confirm the rendered foliage is moving in both endpoint holds, including the final frame.
    for i in (0, 149, 960, 1079):
        actual = frame_at(FILM, i)
        expected = edit.compose(frame_at(source, i), edit.background(i/FPS), edit.camera(i/FPS))
        assert differences(actual, expected) < 2.5
    result = {'film_bytes': FILM.stat().st_size, 'cover_bytes': COVER.stat().st_size,
              'seconds': 36, 'frames': FRAMES, 'fps': FPS, 'leaf_frames_checked': FRAMES,
              'encoded_leaf_max_identical_run': encoded_leaves(edit),
              'clip_frames': clips, 'wattle_overlap_actual_vs_neutral': verify_outlines(edit), 'encoded_beak_bottom_y': contacts,
              'peck_timings': next(c['timings'] for c in geometry['cues'] if c['label'] == 'Double peck')}
    (CAPTURE / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    run_checks()
