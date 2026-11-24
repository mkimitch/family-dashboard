// Exercise the real calendar in the same credential-free workspace as the recorded demos.
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { artifacts, root } from './common.mjs';
import { fixtureFor, scenes } from './fixtures.mjs';
import { verifyTurkey } from './verify-turkey.mjs';
import { prepareFixtureWorkspace } from './workspace.mjs';

const thanksgiving = {
	date: '2026-11-26',
	anchor: '2026-11-25',
	events: [
		['09:00', 'Morning walk'],
		['13:00', 'Family lunch'],
		['18:00', 'Pie tasting']
	]
};
const doublePeck = process.argv.includes('--double-peck') && !process.argv.includes('--production');
const installation = JSON.stringify({
	version: 1,
	global: { density: 'full' },
	decorations: { diwali: { density: 'adaptive' } }
});
await mkdir(artifacts, { recursive: true });
const workspace = await mkdtemp(join(artifacts, '.app-'));
let server;
let browser;
try {
	await prepareFixtureWorkspace(workspace);
	if (process.argv.includes('--serve'))
		await cp(join(root, 'static/lottie'), join(workspace, 'static/lottie'), { recursive: true });
	await mkdir(join(workspace, 'src/routes/away'));
	await writeFile(join(workspace, 'src/routes/away/+page.svelte'), '<p>Fixture away page</p>');
	await mkdir(join(workspace, 'data'));
	const settingsFile = join(workspace, 'data/daymark-settings.json');
	await writeFile(settingsFile, installation);
	await mkdir(join(workspace, 'src/lib/server'));
	await cp(
		join(root, 'src/lib/server/daymarkSettings.ts'),
		join(workspace, 'src/lib/server/daymarkSettings.ts')
	);
	await writeFile(
		join(workspace, 'src/routes/+layout.server.ts'),
		`
import { readInstallationSettings } from '$lib/server/daymarkSettings';
import { DATE_TIME_APP_DEFAULTS } from '$lib/config/dateTime';
export const load = async () => ({ installationSettings: await readInstallationSettings(), photos: [], weather: null, schoolMenu: null, dateTimeDisplay: DATE_TIME_APP_DEFAULTS });
`
	);
	if (process.argv.includes('--production')) {
		await writeFile(
			join(workspace, 'vite.config.ts'),
			"import { sveltekit } from '@sveltejs/kit/vite'; export default { plugins: [sveltekit()] };"
		);
	}
	const loadFixture = async (name, scene, count, weeks = 1) => {
		const fixture = fixtureFor(name, scene);
		fixture['/api/calendar-config'].calendarDisplay.weeks = weeks;
		const events = fixture['/api/calendar'].events;
		const daily = events.filter((e) => e.start.startsWith(scene.date));
		fixture['/api/calendar'].events = [
			...events.filter((e) => !daily.includes(e)),
			...daily.slice(0, count)
		];
		if (count > daily.length)
			fixture['/api/calendar'].events.push({
				...daily[0],
				id: 'demo-extra',
				title: 'Afternoon crafts'
			});
		await writeFile(join(workspace, 'fixture.json'), JSON.stringify(fixture));
	};
	await loadFixture('thanksgiving', thanksgiving, 4);
	const env = Object.fromEntries(
		['PATH', 'HOME', 'NODE_OPTIONS', 'NODE_EXTRA_CA_CERTS']
			.filter((k) => process.env[k])
			.map((k) => [k, process.env[k]])
	);
	server = fork(
		join(root, 'scripts/demos/server.mjs'),
		process.argv.includes('--production') ? ['--production'] : [],
		{ cwd: workspace, env: { ...env, TZ: 'America/Chicago' } }
	);
	const [{ origin }] = await Promise.race([
		once(server, 'message'),
		once(server, 'exit').then(([code]) => {
			throw Error('Fixture server exited ' + code);
		})
	]);
	const preview =
		origin +
		'/?kiosk=1&calendarPreviewDate=2026-11-25&turkeyPreview=manual' +
		(doublePeck ? '&groundPeckStyle=double' : '');
	if (process.argv.includes('--serve')) {
		console.log('Fictional Thanksgiving preview:', preview);
		await Promise.race([once(process, 'SIGINT'), once(process, 'SIGTERM')]);
	} else {
		browser = await chromium.launch({
			executablePath: process.env.DEMO_CHROMIUM_PATH || '/usr/bin/google-chrome'
		});
		const page = await browser.newPage({
			viewport: { width: 1200, height: 1920 },
			timezoneId: 'America/Chicago',
			serviceWorkers: 'block'
		});
		await page.route('**/*', (route) =>
			new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
		);
		if (process.argv.includes('--production')) {
			await page.goto(preview);
			await page.locator('.turkey').waitFor();
			assert.equal(await page.getByRole('button', { name: 'Play all' }).count(), 0);
		} else {
			await verifyTurkey(page, preview, process.argv.includes('--record'));
		}
		const rects = (cell) =>
			cell
				.locator('.day-head, .time-event')
				.evaluateAll((nodes) =>
					nodes.map((n) => [
						n.textContent.trim(),
						...['x', 'y', 'width', 'height'].map((k) => n.getBoundingClientRect()[k])
					])
				);
		for (const [name, scene] of [
			['thanksgiving', thanksgiving],
			['diwali', scenes.diwali],
			['halloween', scenes.halloween]
		]) {
			for (const count of [3, 4]) {
				await loadFixture(name, scene, count);
				let baseline;
				for (const policy of ['', 'reduced', 'full', 'adaptive']) {
					await page.goto(
						origin +
							'/?kiosk=1&calendarPreviewDate=' +
							scene.anchor +
							(policy ? '&decorationDensity=' + policy : '')
					);
					const cell = page.locator('[data-date="' + scene.date + '"]');
					await cell
						.locator('.time-event')
						.nth(count - 1)
						.waitFor();
					assert.equal(await cell.getAttribute('data-crowded'), String(count >= 4));
					if (name === 'thanksgiving' && count === 3 && !policy) {
						await page.emulateMedia({ reducedMotion: 'reduce' });
						await cell
							.locator('.turkey')
							.screenshot({ path: join(artifacts, 'thanksgiving-rest.png') });
						await page.emulateMedia({ reducedMotion: 'no-preference' });
					}
					const art = cell.locator('.day-decoration');
					const effective = policy || (name === 'diwali' ? 'adaptive' : 'full');
					const reduced =
						effective === 'reduced' ||
						(effective === 'adaptive' && name !== 'halloween' && count >= 4);
					assert.equal(await art.getAttribute('data-richness'), reduced ? 'reduced' : 'full');
					assert.equal(await art.getAttribute('aria-hidden'), 'true');
					assert.deepEqual(
						await art.evaluate((el) => [
							getComputedStyle(el).pointerEvents,
							getComputedStyle(el).overflow
						]),
						['none', 'clip']
					);
					const geometry = await rects(cell);
					baseline ??= geometry;
					assert.deepEqual(geometry, baseline);
					if (name === 'thanksgiving')
						assert.equal(await art.locator('.leaf:visible').count(), reduced ? 2 : 3);
					if (name === 'halloween')
						assert.equal(await art.locator('.ghost:visible').count(), reduced ? 0 : 1);
					if (name === 'diwali') {
						assert.equal(await art.locator('.lantern:visible').count(), reduced ? 0 : 1);
						assert.equal(
							await page
								.locator('[data-intensity="subtle"] .lantern, [data-intensity="moderate"] .lantern')
								.count(),
							0
						);
					}
				}
			}
		}
		await loadFixture('diwali', scenes.diwali, 4, 3);
		await page.setViewportSize({ width: 1200, height: 900 });
		await page.goto(origin + '/?calendarPreviewDate=2026-11-03&decorationDensity=full');
		const compact = page.locator('[data-date="2026-11-08"]');
		await compact.locator('.time-event').nth(3).waitFor();
		// Constrain the absolute artwork to exercise the short-cell query independently of event height.
		await compact.locator('.diwali-artwork').evaluate((el) => {
			el.style.height = '10rem';
		});
		assert.equal(await compact.locator('.sparkles:visible').count(), 0);
		assert.equal(await compact.locator('.lantern:visible').count(), 1);
		const entry = compact.locator('.time-event').first();
		await entry.scrollIntoViewIfNeeded();
		assert(
			await entry.evaluate((el) => {
				const box = el.getBoundingClientRect();
				return el.contains(
					document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
				);
			})
		);
		assert((await compact.ariaSnapshot()).includes('Family Celebration'));
		assert.equal(await readFile(settingsFile, 'utf8'), installation);
		// Change only the disposable fixture's installation and verify a real automatic run.
		const trial = JSON.parse(installation);
		trial.global.motions = {
			head: { intervalMs: [1000, 1000], durationMs: 1600 },
			wattle: { enabled: false },
			wing: { enabled: false },
			peck: { enabled: false },
			tail: { enabled: false }
		};
		await writeFile(settingsFile, JSON.stringify(trial));
		await loadFixture('thanksgiving', thanksgiving, 4);
		await page.goto(origin + '/?calendarPreviewDate=2026-11-25');
		const one = await page.waitForFunction(() => {
			const list = document
				.querySelector('.turkey')
				?.getAnimations({ subtree: true })
				.filter((a) => a.id.startsWith('turkey-'));
			return list?.length ? list : null;
		});
		assert.deepEqual(
			await one.evaluate((list) => list.map((a) => [a.id, a.effect.getTiming().duration])),
			[['turkey-head', 1600]]
		);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.waitForFunction(
			() => document.querySelector('.harvest')?.getAnimations({ subtree: true }).length === 0
		);
		assert(await one.evaluate((list) => list.every((a) => a.playState === 'idle')));
		await one.dispose();

		await page.emulateMedia({ reducedMotion: 'no-preference' });
		if (!process.argv.includes('--production')) {
			await page.goto(preview);
			await page.getByRole('button', { name: 'Single peck' }).waitFor();
			for (const label of ['Single peck', 'Double peck', 'Random peck'])
				assert(await page.getByRole('button', { name: label }).isDisabled());
		}
		// Inherited installation style reaches the automatic controller with a custom base duration.
		trial.decorations.thanksgiving = { groundPeckStyle: 'double' };
		trial.global.motions.head.enabled = false;
		trial.global.motions.peck = { intervalMs: [1000, 1000], durationMs: 2100 };
		await writeFile(settingsFile, JSON.stringify(trial));
		await page.goto(origin + '/?calendarPreviewDate=2026-11-25');
		await page.waitForFunction(() =>
			document
				.querySelector('.face')
				?.getAnimations()
				.some((a) => a.id === 'turkey-peck' && a.effect.getTiming().duration === 2500)
		);
		assert.equal(await page.locator('.wattle').evaluate((el) => el.getAnimations().length), 0);

		console.log(
			'Passed fictional density, inheritance, and geometry checks for all three holidays.'
		);
	}
} finally {
	await browser?.close();
	if (server && server.exitCode === null && server.signalCode === null) {
		const closed = once(server, 'exit');
		server.kill();
		await closed;
	}
	await rm(workspace, { recursive: true, force: true });
}
