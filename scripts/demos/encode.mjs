import assert from 'node:assert/strict';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	artifacts,
	checkEncoders,
	ffmpeg,
	ffprobe,
	inspectWebP,
	media,
	overlap,
	run,
	seconds
} from './common.mjs';
import { scenes, selectScenes } from './fixtures.mjs';

await checkEncoders();
const duration = seconds - overlap;
for (const name of selectScenes(process.argv.slice(2))) {
	const scene = scenes[name];
	const dir = join(artifacts, name);
	let capture;
	try {
		capture = JSON.parse(await readFile(join(dir, 'capture.json'), 'utf8'));
	} catch {
		throw new Error(`Missing ${name} capture. Run yarn demos:capture ${name} first.`);
	}
	const source = join(dir, 'source.mkv');
	const loop = join(dir, 'loop.mkv');
	const encode = (args) =>
		run(ffmpeg, [
			'-hide_banner',
			'-loglevel',
			'error',
			'-y',
			'-filter_complex_threads',
			'2',
			'-threads',
			'2',
			...args
		]);
	// Rotate the start by one second, blending the last second into the original
	// first second. The end now meets the new start; no reverse or fade to black.
	await encode([
		'-i',
		source,
		'-filter_complex',
		`[0:v]fps=30,format=yuv444p,split[body][head];` +
			`[body]trim=start=${overlap}:end=${seconds},setpts=PTS-STARTPTS,settb=AVTB[a];` +
			`[head]trim=end=${overlap},setpts=PTS-STARTPTS,settb=AVTB[b];` +
			`[a][b]xfade=transition=fade:duration=${overlap}:offset=${seconds - 2 * overlap}[out]`,
		'-map',
		'[out]',
		'-t',
		String(duration),
		'-an',
		'-c:v',
		'ffv1',
		'-level',
		'3',
		loop
	]);
	const webp = join(media, `${name}.webp`);
	await encode([
		'-i',
		loop,
		'-vf',
		'fps=18,scale=960:-2:flags=lanczos',
		'-c:v',
		'libwebp_anim',
		'-lossless',
		'0',
		'-quality',
		'80',
		'-compression_level',
		'6',
		'-loop',
		'0',
		'-an',
		webp
	]);
	await encode([
		'-ss',
		'3',
		'-i',
		loop,
		'-vf',
		'scale=960:-2:flags=lanczos',
		'-frames:v',
		'1',
		'-update',
		'1',
		join(media, `${name}-poster.png`)
	]);

	const scale = capture.deviceScaleFactor;
	const even = (value) => Math.floor((value * scale) / 2) * 2;
	const { main } = capture;
	// The single day + its weekday header are cropped from the SAME capture,
	// proportionally scaled and padded. Branding never overlays calendar content.
	const socialFilter = [
		`crop=${even(main.width)}:${even(main.height)}:${even(main.x)}:${even(main.y)}`,
		'scale=960:1400:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos',
		'pad=1080:1920:(ow-iw)/2:350:color=0x10101c',
		"drawtext=font='DejaVu Sans':text='DAYMARK':fontsize=36:fontcolor=0xa8adbf:x=(w-tw)/2:y=95",
		`drawtext=font='DejaVu Sans':text='${scene.title}':fontsize=52:fontcolor=0xf4ddb0:x=(w-tw)/2:y=180`,
		`drawtext=font='DejaVu Sans':text='${scene.caption}':fontsize=30:fontcolor=0xd5d7e2:x=(w-tw)/2:y=260`,
		"drawtext=font='DejaVu Sans':text='Fictional demonstration events':fontsize=26:fontcolor=0xa8adbf:x=(w-tw)/2:y=1810"
	].join(',');
	const mp4 = join(artifacts, `${name}-vertical.mp4`);
	await encode([
		'-i',
		loop,
		'-vf',
		socialFilter,
		'-r',
		'30',
		'-c:v',
		'libx264',
		'-preset',
		'slow',
		'-crf',
		'20',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		'-an',
		mp4
	]);
	await encode([
		'-ss',
		'3',
		'-i',
		mp4,
		'-frames:v',
		'1',
		'-update',
		'1',
		join(dir, 'social-poster.png')
	]);
	// Save review evidence around the seam and measure pixel continuity.
	const seam = [];
	for (const [label, time] of [
		['first', 0],
		['last', duration - 1 / 30]
	]) {
		const raw = join(dir, `${label}.rgb`);
		await encode([
			'-ss',
			String(time),
			'-i',
			loop,
			'-frames:v',
			'1',
			'-pix_fmt',
			'rgb24',
			'-f',
			'rawvideo',
			raw
		]);
		seam.push(await readFile(raw));
		await encode([
			'-ss',
			String(time),
			'-i',
			loop,
			'-frames:v',
			'1',
			'-update',
			'1',
			join(dir, `${label}.png`)
		]);
	}
	assert.equal(seam[0].length, seam[1].length);
	let difference = 0;
	for (let i = 0; i < seam[0].length; i++) difference += Math.abs(seam[0][i] - seam[1][i]);
	const seamMeanDifference = difference / seam[0].length;
	assert(
		seamMeanDifference < 5,
		`Visible seam risk: mean channel difference ${seamMeanDifference.toFixed(2)}/255`
	);
	const webpInfo = await inspectWebP(webp);
	assert(webpInfo.frames > 1 && webpInfo.loop === 0 && webpInfo.width === 960);
	assert(Math.abs(webpInfo.durationMs - duration * 1000) < 100);
	const probe = JSON.parse(
		await run(ffprobe, [
			'-v',
			'error',
			'-count_frames',
			'-show_streams',
			'-show_format',
			'-of',
			'json',
			mp4
		])
	);
	const video = probe.streams.find((stream) => stream.codec_type === 'video');
	assert.equal(probe.streams.length, 1, 'Export must have only one video stream, without audio.');
	assert.equal(video.codec_name, 'h264');
	assert.equal(video.pix_fmt, 'yuv420p');
	assert.equal(video.width, 1080);
	assert.equal(video.height, 1920);
	assert.equal(video.avg_frame_rate, '30/1');
	assert.equal(Number(video.nb_read_frames), duration * 30);
	const report = {
		name,
		duration,
		webp: webpInfo,
		mp4: {
			bytes: (await stat(mp4)).size,
			codec: video.codec_name,
			width: video.width,
			height: video.height,
			fps: video.avg_frame_rate,
			frames: video.nb_read_frames,
			pixelFormat: video.pix_fmt
		},
		sourceCapturedFps: capture.capturedFps,
		sourceMotionFps: capture.motionFps,
		seamMeanDifference
	};
	await writeFile(join(dir, 'verification.json'), JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));
	if (webpInfo.bytes > 5_000_000)
		console.warn(`${name}: WebP exceeds 5 MB; review quality/size before committing.`);
}
