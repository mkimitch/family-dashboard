import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { ffmpeg, run } from '../../../../scripts/demos/common.mjs';
import { measurePoses } from './poses.mjs';
import { verifyTurkey } from '../../../../scripts/demos/verify-turkey.mjs';

const dir = fileURLToPath(new URL('../capture/', import.meta.url));
await mkdir(dir, { recursive: true });
const fixture = JSON.parse(await readFile(new URL('fixture.json', import.meta.url)));
const calendar = fixture['/api/calendars'].find((c) => c.label === 'US');
assert.equal(calendar.sortOrder, 4);
assert.equal(calendar.color, '#60a5fa');
assert(calendar.icon);
const events = fixture['/api/calendar'].events;
assert(events.every((e) => e.id.startsWith('fixture-')));
const holidays = events.filter((e) => e.title === 'Thanksgiving Day');
assert.deepEqual(holidays, [
	{
		id: 'fixture-thanksgiving-day',
		title: 'Thanksgiving Day',
		allDay: true,
		start: '2026-11-26',
		end: '2026-11-27',
		calendarId: calendar.id
	}
]);
const url = new URL(process.env.THANKSGIVING_PREVIEW_ORIGIN);
assert.equal(url.hostname, '127.0.0.1');
url.search =
	'kiosk=1&calendarPreviewDate=2026-11-25&seasonDate=2026-11-26&turkeyPreview=manual&decorationDensity=adaptive';
const fps = 30;
const posesOnly = process.argv.includes('--poses-only');
// The two alternate gestures follow the film on the same source timeline.
const cues = [
	['Head tilt', 9],
	['Wing ruffle', 14],
	['Tail ruffle', 17.5],
	['Double peck', 22],
	['Wattle wobble', 37],
	['Single peck', 40]
].map(([label, seconds]) => ({ label, frame: Math.round(seconds * fps) }));
const frames = 42 * fps;
const browser = await chromium.launch({
	executablePath: process.env.DEMO_CHROMIUM_PATH || '/usr/bin/google-chrome'
});
let encoder;
try {
	const page = await browser.newPage({
		viewport: { width: 1200, height: 1920 },
		deviceScaleFactor: 1,
		timezoneId: 'America/Chicago',
		locale: 'en-US',
		serviceWorkers: 'block'
	});
	page.on('crash', () => console.error('Chromium renderer crashed'));
	await page.route('**/*', (route) => {
		const { origin, pathname } = new URL(route.request().url());
		if (origin !== url.origin) return route.abort();
		if (/^\/(photos|fixtures)\//.test(pathname)) return route.abort();
		if (pathname.startsWith('/api/'))
			return Object.hasOwn(fixture, pathname)
				? route.fulfill({ json: fixture[pathname] })
				: route.fulfill({ status: 404, body: '' });
		return route.continue();
	});
	await page.clock.setFixedTime(new Date('2026-11-25T06:00:00-06:00'));
	if (!posesOnly) await verifyTurkey(page, url.href);
	await page.goto(url.href);
	const cell = page.locator('[data-date="2026-11-26"]');
	const chip = cell.locator(
		'.all-day-chip.is-start.is-end:not(.task-chip)[title="Thanksgiving Day"]'
	);
	await chip.waitFor();
	await cell.getByText('Thanksgiving Dinner', { exact: true }).waitFor();
	assert.equal(await page.locator('.all-day-chip[title="Thanksgiving Day"]').count(), 1);
	assert.equal(
		await chip.evaluate((el) => getComputedStyle(el).getPropertyValue('--cal-color').trim()),
		calendar.color
	);
	await page.evaluate(() => document.fonts.ready);
	const geometry = await cell.evaluate((el) => {
		const rect = (node) => {
			const b = node.getBoundingClientRect();
			const x = Math.floor(b.x),
				y = Math.floor(b.y);
			return { x, y, width: Math.ceil(b.right) - x, height: Math.ceil(b.bottom) - y };
		};
		const grid = rect(document.querySelector('.cal-grid'));
		const box = rect(el);
		const friday = rect(document.querySelector('[data-date="2026-11-27"]'));
		const wide = { ...grid, width: friday.x + friday.width - grid.x };
		return { wide, box, turkey: rect(el.querySelector('.turkey')), wideScale: 2, cellScale: 4 };
	});
	const cdp = await page.context().newCDPSession(page);
	const frameRegion = (region, scale) =>
		page.evaluate(
			({ region, scale }) => {
				const root = document.documentElement;
				root.style.transformOrigin = '0 0';
				root.style.transform =
					'matrix(' + [scale, 0, 0, scale, -region.x * scale, -region.y * scale].join(',') + ')';
			},
			{ region, scale }
		);
	const snap = async (region, scale) => {
		const clip = {
			x: 0,
			y: 0,
			width: region.width * scale,
			height: region.height * scale,
			scale: 1
		};
		const { data } = await cdp.send('Page.captureScreenshot', {
			format: 'png',
			clip,
			optimizeForSpeed: true,
			captureBeyondViewport: false
		});
		const png = Buffer.from(data, 'base64');
		assert.equal(png.readUInt32BE(16), clip.width);
		assert.equal(png.readUInt32BE(20), clip.height);
		return png;
	};
	await page.evaluate(() => {
		window.leavesAndGlow = document.querySelector('.harvest').getAnimations({ subtree: true });
		window.gesture = [];
		for (const a of window.leavesAndGlow) {
			a.pause();
			a.currentTime = 0;
		}
	});
	const ambient = await page.evaluate(() =>
		window.leavesAndGlow.map((a) => [a.animationName, a.effect.getTiming().duration])
	);
	assert.deepEqual(
		ambient.map(([, duration]) => duration).sort((a, b) => a - b),
		[11000, 38000, 47000, 54000]
	);
	await frameRegion(geometry.wide, geometry.wideScale);
	if (!posesOnly) await writeFile(dir + 'wide.png', await snap(geometry.wide, geometry.wideScale));
	await frameRegion(geometry.box, geometry.cellScale);
	const b = await cell.boundingBox();
	assert(Math.abs(b.x) < 4 && Math.abs(b.y) < 4 && Math.abs(b.width - geometry.box.width * 4) < 8);
	const panel = await page
		.getByRole('complementary', { name: 'Turkey animation preview' })
		.boundingBox();
	assert(panel.y + panel.height < 0 || panel.y > geometry.box.height * 4);
	await writeFile(dir + 'poses.json', JSON.stringify(await measurePoses(page)));
	if (posesOnly) {
		await browser.close();
		process.exit(0);
	}
	encoder = spawn(
		ffmpeg,
		[
			'-v',
			'error',
			'-y',
			'-f',
			'image2pipe',
			'-framerate',
			'30',
			'-c:v',
			'png',
			'-i',
			'pipe:0',
			'-an',
			'-c:v',
			'libx264rgb',
			'-crf',
			'0',
			'-preset',
			'veryfast',
			'-threads',
			'2',
			dir + 'cell.partial.mkv'
		],
		{ stdio: ['pipe', 'ignore', 'inherit'] }
	);
	const done = once(encoder, 'close');
	let cue;
	console.log('Capturing fictional calendar.', geometry);
	for (let i = 0; i < frames; i++) {
		const next = cues.find((item) => item.frame === i);
		if (next) {
			cue = next;
			cue.timings = await page.evaluate(async (label) => {
				const buttons = [
					...document.querySelectorAll('aside[aria-label="Turkey animation preview"] button')
				];
				const button = (text) => buttons.find((b) => b.textContent.trim() === text);
				button('Stop/Reset').click();
				await Promise.resolve();
				const trigger = button(label);
				if (trigger.disabled) throw Error(label + ' control unavailable');
				trigger.click();
				window.gesture = document
					.querySelector('.turkey')
					.getAnimations({ subtree: true })
					.filter((a) => a.id.startsWith('turkey-'));
				return window.gesture.map((a) => {
					a.pause();
					a.currentTime = 0;
					const { duration, delay } = a.effect.getTiming();
					return { id: a.id, duration, delay };
				});
			}, cue.label);
			assert.equal(
				cue.timings.length,
				cue.label.endsWith('peck') ? 3 : cue.label === 'Head tilt' ? 2 : 1
			);
			if (cue.label === 'Double peck') {
				assert(cue.timings.filter((a) => a.duration === 1250).length === 2);
				assert(
					cue.timings.some((a) => a.id === 'turkey-wattle' && a.duration === 450 && a.delay === 504)
				);
			}
		}
		await page.evaluate(
			([ms, elapsed]) => {
				for (const a of window.leavesAndGlow) a.currentTime = ms;
				for (const a of window.gesture) a.currentTime = elapsed;
			},
			[(i * 1000) / fps, cue ? ((i - cue.frame) * 1000) / fps : 0]
		);
		if (!encoder.stdin.write(await snap(geometry.box, 4))) await once(encoder.stdin, 'drain');
		if ((i + 1) % 180 === 0) console.log('Captured', i + 1, '/', frames);
	}
	encoder.stdin.end();
	assert.equal((await done)[0], 0);
	await rename(dir + 'cell.partial.mkv', dir + 'cell.mkv');
	for (const cue of cues) {
		const rest = 18; // 600 ms before and after the longest participating timeline.
		const start = cue.frame - rest;
		const duration = Math.max(...cue.timings.map((a) => a.delay + a.duration));
		const end = cue.frame + Math.ceil((duration * fps) / 1000) + rest;
		assert(end <= frames);
		const slug = cue.label.toLowerCase().replaceAll(' ', '-');
		await run(ffmpeg, [
			'-v',
			'error',
			'-y',
			'-i',
			dir + 'cell.mkv',
			'-vf',
			'trim=start_frame=' + start + ':end_frame=' + end + ',setpts=PTS-STARTPTS',
			'-an',
			'-c:v',
			'libx264rgb',
			'-crf',
			'0',
			'-preset',
			'veryfast',
			'-threads',
			'2',
			dir + slug + '.mkv'
		]);
	}
	await writeFile(
		dir + 'geometry.json',
		JSON.stringify({ ...geometry, fps, frames, cues, ambient }, null, 2)
	);
} finally {
	if (encoder?.exitCode === null) encoder.kill();
	await browser.close();
}
