import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { ffmpeg } from '../../../../scripts/demos/common.mjs';
import { setFixture, showcaseFixturePath } from './fixture.mjs';

const url = new URL(
	'http://vaio.home.arpa:4186/?kiosk=1&calendarPreviewDate=2026-11-25&seasonDate=2026-11-26'
);
if (process.env.THANKSGIVING_PREVIEW_ORIGIN) {
	const origin = new URL(process.env.THANKSGIVING_PREVIEW_ORIGIN);
	url.host = origin.host;
	url.protocol = origin.protocol;
}
url.searchParams.set('turkeyPreview', 'manual');
url.searchParams.set('decorationDensity', 'adaptive');
const dir = fileURLToPath(new URL('../capture/thanksgiving-day/', import.meta.url));
const viewport = { width: 1200, height: 1920 };
const dpr = 4;
const fps = 30;
const seconds = 62;
const selector = '[data-date="2026-11-26"]';
const validTitles = new Set(
	'Morning walk|Library visit|Grocery pickup|Piano practice|Bake pumpkin pie|Set the table|Family movie|Turkey Trot|Holiday Gathering|Thanksgiving Dinner|Movie Night|Park outing|Leftovers lunch|Craft afternoon|Farmers market|Soccer practice|Dinner with friends|Pancake breakfast|Reading hour|Meal prep|School drop-off|Music lesson|Homework club|Dentist appointment|Library returns|Thanksgiving Day|Make place cards'.split(
		'|'
	)
);
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.DEMO_CHROMIUM_PATH });
let encoder;
try {
	const page = await browser.newPage({
		viewport,
		deviceScaleFactor: 1,
		timezoneId: 'America/Chicago',
		locale: 'en-US',
		serviceWorkers: 'block'
	});
	let dense = false;
	const originalFixture = process.env.THANKSGIVING_PREVIEW_ORIGIN
		? setFixture(JSON.parse(await readFile(await showcaseFixturePath(), 'utf8')))
		: null;
	const calendars =
		originalFixture?.['/api/calendars'] ??
		(await (await page.request.get(url.origin + '/api/calendars')).json());
	const calendar = calendars.find((c) => (c.label ?? c.name) === 'US');
	assert(calendar && calendar.color === '#60a5fa');
	await page.route('**/*', async (route) => {
		const { origin, pathname } = new URL(route.request().url());
		if (origin !== url.origin) return route.fulfill({ json: {} });
		if (pathname.startsWith('/photos/') || pathname.startsWith('/fixtures/'))
			return route.fulfill({
				contentType: 'image/gif',
				body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
			});
		if (pathname !== '/api/calendar' && originalFixture && Object.hasOwn(originalFixture, pathname))
			return route.fulfill({ json: originalFixture[pathname] });
		if (pathname === '/api/calendar') {
			const data = originalFixture
				? structuredClone(originalFixture[pathname])
				: await (await route.fetch()).json();
			assert(data.events.every((e) => e.id.startsWith('fixture-') && validTitles.has(e.title)));
			const holidays = data.events.filter((e) => e.title === 'Thanksgiving Day');
			assert(
				holidays.length === 1 &&
					holidays[0].allDay &&
					holidays[0].start === '2026-11-26' &&
					holidays[0].end === '2026-11-27' &&
					holidays[0].calendarId === calendar.id
			);
			if (dense) setFixture({ '/api/calendars': calendars, '/api/calendar': data }, true);
			return route.fulfill({ json: data });
		}
		return route.continue();
	});
	await page.clock.setFixedTime(new Date('2026-11-25T06:00:00-06:00'));
	const ready = async (frame) => {
		const cell = frame.locator(selector);
		const chip = cell.locator(
			'.all-day-chip.is-start.is-end:not(.task-chip)[title="Thanksgiving Day"]'
		);
		await chip.waitFor({ state: 'visible' });
		await cell.getByText('Thanksgiving Dinner', { exact: true }).waitFor();
		assert.equal(await frame.locator('.all-day-chip[title="Thanksgiving Day"]').count(), 1);
		assert.equal(
			await chip.evaluate((el) => getComputedStyle(el).getPropertyValue('--cal-color').trim()),
			calendar.color
		);
		assert.deepEqual(await cell.locator('.harvest.crowded').count(), Number(dense));
		assert.equal(await cell.locator('.leaf:visible').count(), dense ? 2 : 3);
		await frame.evaluate(() => document.fonts.ready);
		return cell;
	};
	await page.goto(url.href);
	const cell = await ready(page);
	const geometry = await cell.evaluate((el) => {
		const rect = (node) => {
			const b = node.getBoundingClientRect();
			return {
				x: Math.floor(b.x),
				y: Math.floor(b.y),
				width: Math.ceil(b.right) - Math.floor(b.x),
				height: Math.ceil(b.bottom) - Math.floor(b.y)
			};
		};
		return {
			grid: rect(document.querySelector('.cal-grid')),
			box: rect(el),
			turkey: rect(el.querySelector('.turkey'))
		};
	});
	const freeze = async (cell) => {
		await page.getByRole('button', { name: 'Tail ruffle' }).click();
		return cell.locator('.harvest').evaluate((el) => {
			const list = el.getAnimations({ subtree: true });
			for (const a of list) {
				a.pause();
				a.currentTime = 0;
			}
			window.seekHarvest = (ms) => {
				for (const a of list) {
					// Original 34 s cycle, -5 s phase, active over its final 5%.
					a.currentTime = a.id === 'turkey-tail' ? Math.max(0, ((ms + 5000) % 34000) - 32300) : ms;
				}
			};
			return list.map((a) => ({
				name: a.id || a.animationName,
				duration: a.effect.getTiming().duration,
				delay: a.effect.getTiming().delay
			}));
		});
	};
	const animations = await freeze(cell);
	assert.deepEqual(
		animations
			.filter((a) => a.name.includes('harvest-fall'))
			.map((a) => a.duration)
			.sort(),
		[38000, 47000, 54000]
	);
	assert(animations.some((a) => a.name === 'turkey-tail' && a.duration === 1700 && a.delay === 0));
	if (process.argv.includes('--verify-only')) {
		await page.evaluate(() => window.seekHarvest(27980));
		assert.notEqual(
			await cell.locator('.tail').evaluate((el) => getComputedStyle(el).transform),
			'none'
		);
		dense = true;
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.reload();
		const reduced = await ready(page);
		assert.equal(
			await reduced
				.locator('.harvest')
				.evaluate((el) => el.getAnimations({ subtree: true }).length),
			0
		);
		console.log('Showcase tail cue and dense static scene verified.');
	} else {
		const cdp = await page.context().newCDPSession(page);
		const snap = async (clip, scale = dpr) =>
			Buffer.from(
				(
					await cdp.send(
						'Page.captureScreenshot',
						clip
							? { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale } }
							: { format: 'png' }
					)
				).data,
				'base64'
			);
		const wide = await snap(geometry.grid);
		assert.equal(wide.readUInt32BE(16), geometry.grid.width * dpr);
		await writeFile(dir + 'week.png', wide);
		await writeFile(
			dir + 'geometry.json',
			JSON.stringify({ ...geometry, dpr, fps, seconds, animations }, null, 2)
		);

		// Move the camera after layout. The kiosk keeps its original CSS viewport.
		// Chromium rasterizes the transformed SVG and type into the larger crop.
		const { x, y, width, height } = geometry.box;
		const closeClip = { x: 0, y: 0, width: width * dpr, height: height * dpr };
		const frameCell = async () => {
			await page.evaluate(
				({ x, y, dpr }) => {
					const root = document.documentElement;
					root.style.transformOrigin = '0 0';
					root.style.transform = 'matrix(' + [dpr, 0, 0, dpr, -x * dpr, -y * dpr].join(',') + ')';
				},
				{ x, y, dpr }
			);
			const b = await cell.boundingBox();
			assert(Math.abs(b.x) < 4 && Math.abs(b.y) < 4 && Math.abs(b.width - width * dpr) < 8);
		};
		dense = true;
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.reload();
		const reduced = await ready(page);
		assert.equal(
			await reduced
				.locator('.harvest')
				.evaluate((el) => el.getAnimations({ subtree: true }).length),
			0
		);
		await frameCell();
		await writeFile(dir + 'dense-reduced.png', await snap(closeClip, 1));
		dense = false;
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.reload();
		await ready(page);
		await freeze(cell);
		await frameCell();
		const first = await snap(closeClip, 1);
		assert.equal(first.readUInt32BE(16), width * dpr);
		assert.equal(first.readUInt32BE(20), height * dpr);
		await writeFile(dir + 'sparse.png', first);
		console.log('Verified single-day US event and artwork density in both states.', geometry);
		encoder = spawn(
			ffmpeg,
			[
				'-v',
				'error',
				'-y',
				'-f',
				'image2pipe',
				'-framerate',
				String(fps),
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
				dir + 'cell.mkv'
			],
			{ stdio: ['pipe', 'ignore', 'inherit'] }
		);
		const done = once(encoder, 'close');
		for (let i = 0; i < seconds * fps; i++) {
			await page.evaluate((ms) => window.seekHarvest(ms), (i * 1000) / fps);
			if (!encoder.stdin.write(await snap(closeClip, 1))) await once(encoder.stdin, 'drain');
			if ((i + 1) % 300 === 0) console.log('Source frames:', i + 1);
		}
		encoder.stdin.end();
		assert.equal((await done)[0], 0);
	}
} finally {
	if (encoder?.exitCode === null) encoder.kill();
	await browser.close();
}
