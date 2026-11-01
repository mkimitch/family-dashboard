import assert from 'node:assert/strict';
import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { chromium } from 'playwright-core';
import { artifacts, checkEncoders, ffmpeg, ffprobe, root, run, seconds } from './common.mjs';
import { fixtureFor, scenes, selectScenes } from './fixtures.mjs';

const names = selectScenes(process.argv.slice(2));
await checkEncoders();
const workspace = await mkdtemp(join(artifacts, '.app-'));
let server;
let browser;
let displayServer;
const log = createWriteStream(join(artifacts, 'server.log'));
let cleanup;
const clean = () =>
	(cleanup ??= (async () => {
		await browser?.close();
		for (const child of [server, displayServer]) {
			if (child?.pid && child.exitCode === null && child.signalCode === null) {
				const exited = once(child, 'exit');
				child.kill('SIGTERM');
				await exited;
			}
		}
		log.end();
		await rm(workspace, { recursive: true, force: true });
	})());
for (const signal of ['SIGINT', 'SIGTERM']) {
	process.once(signal, async () => {
		await clean();
		process.exit(1);
	});
}

try {
	// Copy the real UI verbatim, but never any production server code, environment
	// files, photos, databases, or configured calendar/countdown data.
	await mkdir(join(workspace, 'src/routes'), { recursive: true });
	await mkdir(join(workspace, 'static'), { recursive: true });
	await cp(join(root, 'src/lib'), join(workspace, 'src/lib'), {
		recursive: true,
		filter: (path) => {
			const name = relative(join(root, 'src/lib'), path).replaceAll('\\', '/');
			return (
				!/^(server|config\/(calendars|countdowns)\.ts)(\/|$)/.test(name) &&
				!name.endsWith('.test.ts')
			);
		}
	});
	for (const path of [
		'src/app.html',
		'src/app.css',
		'src/routes/+layout.svelte',
		'src/routes/+page.svelte',
		'svelte.config.js',
		'tsconfig.json',
		'static/error-logger.js',
		'static/manifest.webmanifest',
		'static/daymark.svg',
		'static/daymark-app.svg'
	])
		await cp(join(root, path), join(workspace, path));
	await cp(join(root, 'static/assets'), join(workspace, 'static/assets'), { recursive: true });
	await mkdir(join(workspace, 'static/svg/static'), { recursive: true });
	for (const icon of ['rpi.svg', 'server.svg']) {
		await cp(join(root, 'static/svg/static', icon), join(workspace, 'static/svg/static', icon));
	}
	await writeFile(join(workspace, 'package.json'), '{"type":"module","private":true}');
	await writeFile(
		join(workspace, 'src/lib/config/countdowns.ts'),
		'export const MAX_VISIBLE_COUNTDOWNS = 3; export default [];\n'
	);
	await writeFile(
		join(workspace, 'src/routes/+layout.server.ts'),
		`
import { DATE_TIME_APP_DEFAULTS } from '$lib/config/dateTime';
export const load = () => ({ photos: [], weather: null, schoolMenu: null,
  dateTimeDisplay: DATE_TIME_APP_DEFAULTS });
`
	);
	await writeFile(
		join(workspace, 'src/routes/+page.server.ts'),
		'export const load = () => ({ countdowns: [] });\n'
	);
	await writeFile(
		join(workspace, 'src/hooks.server.ts'),
		`
import { readFile } from 'node:fs/promises';
export const handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    const fixtures = JSON.parse(await readFile('./fixture.json', 'utf8'));
    if (!Object.hasOwn(fixtures, event.url.pathname))
      return new Response('Unknown demo endpoint', { status: 404 });
    return Response.json(fixtures[event.url.pathname]);
  }
  return resolve(event);
};
export const handleFetch = () => { throw new Error('Network fetching is disabled in demos'); };
`
	);
	// Do not pass credentials or production configuration to the child process.
	const env = Object.fromEntries(
		['PATH', 'HOME', 'NODE_OPTIONS', 'NODE_EXTRA_CA_CERTS']
			.filter((key) => process.env[key])
			.map((key) => [key, process.env[key]])
	);
	server = fork(join(root, 'scripts/demos/server.mjs'), [], {
		cwd: workspace,
		env: { ...env, TZ: 'America/Chicago' },
		silent: true
	});
	server.stdout.pipe(log);
	server.stderr.pipe(log);
	const { origin } = await new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error('Demo server startup timed out; see artifacts/demos/server.log')),
			60000
		);
		server.once('message', (message) => {
			clearTimeout(timer);
			resolve(message);
		});
		server.once('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		server.once('exit', (code) => {
			clearTimeout(timer);
			reject(new Error(`Demo server exited ${code}; see artifacts/demos/server.log`));
		});
	});
	displayServer = spawn(
		'Xvfb',
		['-displayfd', '3', '-screen', '0', '1200x2100x24', '-nolisten', 'tcp'],
		{
			stdio: ['ignore', 'ignore', 'pipe', 'pipe']
		}
	);
	displayServer.stderr.pipe(log);
	const display = await new Promise((resolve, reject) => {
		displayServer.once('error', () =>
			reject(new Error('Xvfb is required for an isolated recording display. Install xvfb.'))
		);
		displayServer.once('exit', (code) => reject(new Error(`Xvfb exited ${code}; see server.log`)));
		displayServer.stdio[3].once('data', (data) => resolve(`:${String(data).trim()}`));
	});
	try {
		browser = await chromium.launch({
			headless: false,
			env: { ...env, DISPLAY: display },
			args: [
				'--kiosk',
				'--window-position=0,0',
				'--window-size=1200,1920',
				'--force-device-scale-factor=1',
				'--disable-gpu'
			],
			...(process.env.DEMO_CHROMIUM_PATH ? { executablePath: process.env.DEMO_CHROMIUM_PATH } : {})
		});
	} catch (error) {
		throw new Error(
			`Chromium launch failed. Run yarn playwright-core install chromium, or set DEMO_CHROMIUM_PATH.\n${error.message}`
		);
	}
	const gpuSession = await browser.newBrowserCDPSession();
	const graphics = (await gpuSession.send('SystemInfo.getInfo')).gpu.featureStatus.gpu_compositing;
	await gpuSession.detach();
	for (const name of names) {
		const scene = scenes[name];
		const fixtures = fixtureFor(name);
		await writeFile(join(workspace, 'fixture.json'), JSON.stringify(fixtures));
		const output = join(artifacts, name);
		const source = join(workspace, `${name}-source.mkv`);
		await mkdir(output, { recursive: true });
		const context = await browser.newContext({
			viewport: { width: 1200, height: 1920 },
			deviceScaleFactor: 1,
			timezoneId: 'America/Chicago',
			locale: 'en-US',
			serviceWorkers: 'block'
		});
		const blocked = [];
		const errors = [];
		await context.route('**/*', (route) => {
			const url = new URL(route.request().url());
			if (url.origin === origin) return route.continue();
			blocked.push(url.origin); // Never record credentials/query strings in logs.
			return route.abort('blockedbyclient');
		});
		const page = await context.newPage();
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		// Fixed Date only: performance.now(), timers, rAF and CSS animations keep running.
		await page.clock.setFixedTime(new Date(`${scene.anchor}T00:30:00${scene.offset}`));
		await page.goto(
			`${origin}/?kiosk&calendarPreviewDate=${scene.anchor}&calendarPreviewLighting=night`
		);

		const cell = page.locator(`[data-date="${scene.date}"]`);
		await cell
			.locator(`.day-decoration[data-decoration="${name}"][data-lighting="night"]`)
			.waitFor();
		await page.waitForFunction(
			(expected) => {
				const actual = [...document.querySelectorAll('.event-title')].map((node) =>
					node.textContent.trim()
				);
				return expected.every((title) => actual.includes(title));
			},
			fixtures['/api/calendar'].events.map((event) => event.title)
		);
		await page.evaluate(async () => {
			await document.fonts.ready;
			await Promise.all([...document.querySelectorAll('.cal-grid img')].map((img) => img.decode()));
		});
		assert.equal(await page.title(), 'Daymark');
		assert.equal(await page.locator('vite-error-overlay').count(), 0);
		assert.equal(
			await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
			false,
			'Reduced motion is active; refusing to override accessibility preferences for capture.'
		);
		if (name === 'diwali') {
			for (const layer of ['rangoli', 'lantern', 'diyas', 'sparkles']) {
				await cell.locator(`.${layer}`).waitFor({ state: 'visible' });
			}
		}
		// Wait for actual finite lighting transitions, leaving infinite art animations alone.
		await page.evaluate(async () => {
			await Promise.all(
				document
					.getAnimations()
					.filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
					.map((animation) => animation.finished.catch(() => {}))
			);
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		});
		const framing = await cell.evaluate((element) => {
			const cells = [...element.parentElement.children];
			const index = cells.indexOf(element);
			const left = cells[index - 1].getBoundingClientRect();
			const right = cells[index + 1].getBoundingClientRect();
			const main = element.getBoundingClientRect();
			const top = document.querySelector('.weekday-row').getBoundingClientRect().top;
			const x = Math.floor(left.x),
				y = Math.floor(top);
			return {
				clip: { x, y, width: Math.ceil(right.right) - x, height: Math.ceil(main.bottom) - y },
				main: { x: main.x - x, y: 0, width: main.width, height: Math.ceil(main.bottom) - y }
			};
		});
		assert(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <= innerWidth &&
					document.documentElement.scrollHeight <= innerHeight
			),
			'Kiosk viewport overflowed.'
		);
		await page.screenshot({ path: join(output, 'kiosk.png'), scale: 'css' });
		console.log(
			`Recording ${name}: real 1200×1920 app, three-cell crop, native pixels, ${seconds}s.`
		);
		// Calibrate the page's physical origin before recording. Window decoration
		// dimensions reported by Chromium differ under Xvfb without a window manager.
		// This temporary marker never enters the saved footage or app source.
		await page.evaluate(async () => {
			const marker = document.createElement('div');
			marker.id = 'demo-origin-probe';
			marker.style.cssText =
				'position:fixed;left:0;top:0;width:8px;height:8px;background:rgb(13,251,37);z-index:2147483647;pointer-events:none';
			document.body.append(marker);
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		});
		await page.locator('#demo-origin-probe').screenshot();
		const probePath = join(workspace, 'display.rgb');
		let markerPixel = -1;
		for (let attempt = 0; attempt < 20 && markerPixel < 0; attempt++) {
			await run(ffmpeg, [
				'-hide_banner',
				'-loglevel',
				'error',
				'-y',
				'-f',
				'x11grab',
				'-video_size',
				'1200x2100',
				'-draw_mouse',
				'0',
				'-i',
				`${display}.0`,
				'-frames:v',
				'1',
				'-pix_fmt',
				'rgb24',
				'-f',
				'rawvideo',
				probePath
			]);
			const pixels = await readFile(probePath);
			for (let i = 0; i < pixels.length; i += 3) {
				if (pixels[i] < 40 && pixels[i + 1] > 230 && pixels[i + 2] < 65) {
					markerPixel = i / 3;
					break;
				}
			}
		}
		await page.locator('#demo-origin-probe').evaluate((marker) => marker.remove());
		assert(markerPixel >= 0, 'Cannot locate the application on the isolated display.');
		const screen = { x: markerPixel % 1200, y: Math.floor(markerPixel / 1200) };
		assert(
			screen.x + framing.clip.x + framing.clip.width <= 1200 &&
				screen.y + framing.clip.y + framing.clip.height <= 2100,
			'Capture would clip the calendar.'
		);
		const before = await cell.screenshot();
		await page.evaluate(() => {
			window.__demoFrameCount = 0;
			const count = () => {
				window.__demoFrameCount++;
				window.__demoRaf = requestAnimationFrame(count);
			};
			window.__demoRaf = requestAnimationFrame(count);
		});
		await run(ffmpeg, [
			'-hide_banner',
			'-loglevel',
			'error',
			'-y',
			'-f',
			'x11grab',
			'-framerate',
			'30',
			'-video_size',
			`${framing.clip.width}x${framing.clip.height}`,
			'-draw_mouse',
			'0',
			'-i',
			`${display}.0+${framing.clip.x + screen.x},${framing.clip.y + screen.y}`,
			'-t',
			String(seconds),
			'-c:v',
			'libx264rgb',
			'-preset',
			'ultrafast',
			'-crf',
			'0',
			'-tune',
			'zerolatency',
			'-pix_fmt',
			'bgr0',
			'-threads',
			'2',
			source
		]);
		const renderedFrames = await page.evaluate(() => {
			cancelAnimationFrame(window.__demoRaf);
			return window.__demoFrameCount;
		});
		const videoInfo = JSON.parse(
			await run(ffprobe, [
				'-v',
				'error',
				'-count_frames',
				'-show_streams',
				'-show_format',
				'-of',
				'json',
				source
			])
		);
		const capturedFrames = Number(videoInfo.streams[0].nb_read_frames);
		const capturedFps = capturedFrames / Number(videoInfo.format.duration);
		const hashes = await run(ffmpeg, ['-v', 'error', '-i', source, '-f', 'framemd5', '-']);
		const frameHashes = hashes
			.split('\n')
			.filter((line) => line && !line.startsWith('#'))
			.map((line) => line.split(',').at(-1).trim());
		const distinctFrames = frameHashes.filter(
			(hash, index) => index === 0 || hash !== frameHashes[index - 1]
		).length;
		console.log({ capturedFrames, capturedFps, distinctFrames });
		assert(
			distinctFrames >= seconds * 10,
			`Only ${distinctFrames} distinct frames in ${seconds}s. Close CPU-heavy applications and retry.`
		);
		if (distinctFrames < seconds * 15)
			console.warn(
				`${name}: ${(distinctFrames / seconds).toFixed(1)} visible updates/sec; renderer-limited, export frames will repeat.`
			);
		const afterImage = await cell.screenshot();
		assert(!before.equals(afterImage), 'No visible animation movement was captured.');
		assert(
			renderedFrames >= 180,
			`Only ${renderedFrames} animation frames rendered during capture.`
		);
		const after = await cell.boundingBox();
		assert(
			Math.abs(after.x - framing.clip.x - framing.main.x) < 1 &&
				Math.abs(after.y + after.height - framing.clip.y - framing.clip.height) < 1,
			'Calendar shifted during recording.'
		);
		assert.deepEqual(blocked, [], 'Unexpected outbound request was blocked.');
		assert.deepEqual(errors, [], 'Browser errors occurred.');
		await rename(source, join(output, 'source.mkv'));
		await writeFile(
			join(output, 'capture.json'),
			JSON.stringify(
				{
					name,
					date: scene.date,
					simulatedNow: `${scene.anchor}T00:30:00${scene.offset}`,
					graphics,
					viewport: { width: 1200, height: 1920 },
					deviceScaleFactor: 1,
					...framing,
					screen,
					seconds,
					capturedFrames,
					distinctFrames,
					motionFps: distinctFrames / seconds,
					renderedFrames,
					capturedFps,
					blockedRequests: blocked,
					browserErrors: errors,
					browser: browser.version(),
					fixture: fixtures['/api/calendar'],
					source: 'source.mkv'
				},
				null,
				2
			)
		);
		await context.close();
		console.log(
			`${name}: ${capturedFrames} frames (${distinctFrames} distinct); lossless source saved in ${output}.`
		);
	}
} finally {
	await clean();
}
