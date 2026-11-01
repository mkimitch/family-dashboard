import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const artifacts = join(root, 'artifacts/demos');
export const media = join(root, 'docs/media/demos');
export const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
export const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
export const seconds = 12;
export const overlap = 1;

export const run = (command, args) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		const stop = () => child.kill('SIGTERM');
		process.once('SIGINT', stop);
		process.once('SIGTERM', stop);
		const release = () => {
			process.removeListener('SIGINT', stop);
			process.removeListener('SIGTERM', stop);
		};
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (data) => (stdout += data));
		child.stderr.on('data', (data) => (stderr = (stderr + data).slice(-12000)));
		child.on('error', (error) => {
			release();
			reject(new Error(`Cannot run ${command}: ${error.message}`));
		});
		child.on('close', (code) => {
			release();
			if (code === 0) resolve(stdout);
			else reject(new Error(`${command} exited ${code}:\n${stderr}`));
		});
	});

export const checkEncoders = async () => {
	const available = await run(ffmpeg, ['-hide_banner', '-encoders']);
	for (const encoder of ['libx264', 'libx264rgb', 'libwebp_anim', 'ffv1', 'png']) {
		if (!available.includes(encoder)) throw new Error(`FFmpeg is missing encoder ${encoder}.`);
	}
	await run(ffprobe, ['-version']);
	const filters = await run(ffmpeg, ['-hide_banner', '-filters']);
	for (const filter of ['xfade', 'drawtext']) {
		if (!filters.includes(filter)) throw new Error(`FFmpeg is missing filter ${filter}.`);
	}
	await mkdir(artifacts, { recursive: true });
	await mkdir(media, { recursive: true });
};

// FFprobe in FFmpeg 6 cannot demux animated WebP. Inspect its RIFF animation
// chunks instead, including frame durations and the infinite-loop flag.
export const inspectWebP = async (path) => {
	const bytes = await readFile(path);
	if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
		throw new Error(`Not a WebP: ${path}`);
	}
	const result = { frames: 0, durationMs: 0, loop: null, width: 0, height: 0, bytes: bytes.length };
	for (let offset = 12; offset + 8 <= bytes.length; ) {
		const type = bytes.toString('ascii', offset, offset + 4);
		const length = bytes.readUInt32LE(offset + 4);
		const data = offset + 8;
		if (data + length > bytes.length) throw new Error(`Truncated WebP chunk: ${path}`);
		if (type === 'VP8X') {
			result.width = bytes.readUIntLE(data + 4, 3) + 1;
			result.height = bytes.readUIntLE(data + 7, 3) + 1;
		}
		if (type === 'ANIM') result.loop = bytes.readUInt16LE(data + 4);
		if (type === 'ANMF') {
			result.frames++;
			result.durationMs += bytes.readUIntLE(data + 12, 3);
		}
		offset = data + length + (length % 2);
	}
	return result;
};
