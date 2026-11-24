import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { artifacts, ffmpeg } from './common.mjs';

const labels = ['Head tilt', 'Wattle wobble', 'Wing ruffle', 'Ground peck', 'Tail ruffle'];
const ids = ['head', 'wattle', 'wing', 'peck', 'tail'];

// The capture seeks the browser's actual transform timelines. It does not drive production motion.
const captureMotion = async (cdp, clip, animations, encoder) => {
	const end = await animations.evaluate((list) =>
		Math.max(...list.map((a) => a.effect.getComputedTiming().endTime))
	);
	for (let ms = -250; ms < end + 250; ms += 1000 / 20) {
		await animations.evaluate(
			(list, time) =>
				list.forEach((a) => {
					a.currentTime = Math.max(0, time);
				}),
			ms
		);
		const { data } = await cdp.send('Page.captureScreenshot', {
			format: 'png',
			clip: { ...clip, scale: 4 }
		});
		if (!encoder.stdin.write(Buffer.from(data, 'base64'))) await once(encoder.stdin, 'drain');
	}
};

// Seek every peck timeline together. The neck changes shape while the face and wattle rotate.
const verifyPeck = async (animations, double) => {
	const poses = await animations.evaluate((list) => {
		const face = list.find((a) => a.id === 'turkey-peck').effect.target;
		const neck = list.find((a) => a.id === 'turkey-peck-neck').effect.target;
		const svg = face.ownerSVGElement;
		const bounds = svg.getBoundingClientRect();
		const breast = svg.querySelector(':scope > path:last-of-type');
		const duration = list.find((a) => a.id === 'turkey-peck').effect.getTiming().duration;
		const snapshot = (fraction) => {
			for (const animation of list) animation.currentTime = duration * fraction;
			const faceToArt = svg.getScreenCTM().inverse().multiply(face.getScreenCTM());
			const eye = new DOMPoint(103, 23.5).matrixTransform(faceToArt);
			const tip = new DOMPoint(120, 29).matrixTransform(faceToArt);
			const root = new DOMPoint(110, 22).matrixTransform(faceToArt);
			const base = neck.getPointAtLength(0);
			const attached = base.x === 93 && base.y === 54;
			const contained = [neck, ...face.querySelectorAll('path')].every((path) => {
				const matrix = path.getScreenCTM();
				const length = path.getTotalLength();
				for (let i = 0; i <= 32; i++) {
					const { x, y } = path.getPointAtLength((length * i) / 32).matrixTransform(matrix);
					if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom)
						return false;
				}
				return true;
			});
			return {
				attached,
				contained,
				clear: !breast.isPointInFill(eye),
				eyeY: eye.y,
				tipX: tip.x,
				tipY: tip.y,
				angle: (Math.atan2(tip.y - root.y, tip.x - root.x) * 180) / Math.PI
			};
		};
		return Array.from({ length: 51 }, (_, i) => snapshot(i / 50));
	});
	assert(
		poses.every((p) => p.attached && p.contained && p.clear),
		'Peck should stay connected, clear of the breast and inside the SVG'
	);
	assert(poses[7].eyeY < poses[0].eyeY, 'Anticipation should lift the head');
	const deepest = poses.reduce((a, b) => (a.tipY > b.tipY ? a : b));
	assert(
		deepest.tipX > 112 &&
			deepest.tipY >= 104 &&
			deepest.tipY <= 111 &&
			deepest.angle >= 70 &&
			deepest.angle <= 110,
		'Beak should point down near the ground in front of the breast'
	);
	assert.deepEqual(poses.at(-1), poses[0], 'Recovery should return to the original pose');
	if (double) {
		const first = poses[22],
			lifted = poses[26],
			second = poses[32];
		const travel = (a, b) => Math.hypot(a.tipX - b.tipX, a.tipY - b.tipY);
		const ratio = travel(lifted, second) / travel(poses[0], first);
		assert(first.tipY > second.tipY && second.tipY > lifted.tipY);
		assert(ratio >= 0.4 && ratio <= 0.6, 'Second strike should cover 40–60% of the first');
	}
};

export const verifyTurkey = async (page, preview, record = false) => {
	await page.goto(preview);
	const recordDouble = new URL(preview).searchParams.get('groundPeckStyle') === 'double';
	const art = page.locator('.harvest');
	const turkey = art.locator('.turkey');
	const controls = page.getByRole('complementary', { name: 'Turkey animation preview' });
	const button = (name) => controls.getByRole('button', { name, exact: true });
	const rest = () => controls.getByText('Resting', { exact: true }).waitFor();
	const active = () =>
		turkey.evaluate(
			(el) => el.getAnimations({ subtree: true }).filter((a) => a.id.startsWith('turkey-')).length
		);
	await rest();
	const feet = await turkey.locator(':scope > path').first().boundingBox();
	const cdp = await page.context().newCDPSession(page);
	const clip = await turkey.boundingBox();
	const panel = await controls.boundingBox();
	assert(
		panel.y + panel.height <= clip.y || panel.y >= clip.y + clip.height,
		'Preview controls must leave the turkey visible'
	);
	const encoder =
		record &&
		spawn(
			ffmpeg,
			[
				'-v',
				'error',
				'-y',
				'-f',
				'image2pipe',
				'-framerate',
				'20',
				'-i',
				'pipe:0',
				'-an',
				'-c:v',
				'libwebp_anim',
				'-q:v',
				'90',
				'-loop',
				'0',
				join(
					artifacts,
					recordDouble ? 'thanksgiving-double-peck-preview.webp' : 'thanksgiving-motions.webp'
				)
			],
			{ stdio: ['pipe', 'ignore', 'inherit'] }
		);
	const encoded = encoder && once(encoder, 'close');
	try {
		const cases = labels.flatMap((label, i) => {
			const id = ids[i];
			const triggers = id === 'peck' ? ['Single peck', 'Double peck', 'Random peck'] : [label];
			return triggers.map((trigger) => ({ id, label, trigger }));
		});
		for (const { id, label, trigger } of cases) {
			await button(trigger).click();
			const animations = await turkey.evaluateHandle((el) => {
				const list = el.getAnimations({ subtree: true }).filter((a) => a.id.startsWith('turkey-'));
				for (const a of list) {
					a.pause();
					a.currentTime = a.effect.getTiming().duration * 0.36;
				}
				return list;
			});
			const names = await animations.evaluate((list) => list.map((a) => a.id));
			assert(names.includes('turkey-' + id));
			assert.equal(names.length, id === 'peck' ? 3 : id === 'head' ? 2 : 1);
			assert.equal(await controls.locator('output').innerText(), label);
			assert.deepEqual(await turkey.locator(':scope > path').first().boundingBox(), feet);
			const target = turkey.locator('.' + (id === 'peck' ? 'face' : id));
			assert.notEqual(await target.evaluate((el) => getComputedStyle(el).transform), 'none');
			if (id === 'peck') {
				const timing = await animations.evaluate(
					(list) => list.find((a) => a.id === 'turkey-peck').effect.getTiming().duration
				);
				assert([1050, 1250].includes(timing));
				const selected = timing === 1250 ? 'double' : 'single';
				if (trigger !== 'Random peck') assert.equal(trigger.toLowerCase(), selected + ' peck');
				await controls.getByText('Last peck: ' + selected, { exact: true }).waitFor();
				await verifyPeck(animations, selected === 'double');
			}
			if (encoder && (id !== 'peck' || trigger === (recordDouble ? 'Double peck' : 'Single peck')))
				await captureMotion(cdp, clip, animations, encoder);
			await button('Stop/Reset').click();
			await rest();
			assert.equal(await active(), 0);
			assert.equal(await target.evaluate((el) => getComputedStyle(el).transform), 'none');
			await animations.dispose();
		}
		if (encoder) {
			encoder.stdin.end();
			assert.equal((await encoded)[0], 0);
		}
	} finally {
		if (encoder && encoder.exitCode === null) encoder.kill();
		await cdp.detach();
	}
	await button('Play all').click();
	for (const label of labels)
		await controls.locator('output').getByText(label, { exact: true }).waitFor();
	await rest();
	await button('Play all').click();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await rest();
	assert(await button('Head tilt').isDisabled());
	for (const label of ['Single peck', 'Double peck', 'Random peck'])
		assert(await button(label).isDisabled());
	const staticArt = async () => {
		assert.equal(await art.evaluate((el) => el.getAnimations({ subtree: true }).length), 0);
		assert(await turkey.isVisible());
		assert.equal(await art.locator('.leaf:visible').count(), 3);
		assert(
			await art.locator('.ambient').evaluate((el) => Number(getComputedStyle(el).opacity) > 0)
		);
	};
	await staticArt();
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await button('Tail ruffle').click();
	// Headless Chromium does not consistently background tabs. Dispatch the DOM signal used by the kiosk.
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await rest();
	await staticArt();
	await page.evaluate(() => {
		delete document.visibilityState;
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await button('Play all').click();
	const old = await turkey.evaluateHandle((el) =>
		el.getAnimations({ subtree: true }).filter((a) => a.id)
	);
	await page.evaluate(() => {
		const a = document.createElement('a');
		a.href = '/away';
		document.body.append(a);
		a.click();
	});
	await page.getByText('Fixture away page').waitFor();
	assert.equal(await controls.count(), 0);
	assert(await old.evaluate((list) => list.every((a) => a.playState === 'idle')));
	await old.dispose();
	await page.goBack();
	await rest();
	await page.goto(preview + '&seasonMotion=off');
	await rest();
	assert(await button('Play all').isDisabled());
	await staticArt();
	console.log(
		'Passed five poses, feet and beak geometry, coordinated wobble, Stop/Reset, sequence, both motion stops, visibility and navigation.'
	);
};
