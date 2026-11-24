import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const capture = new URL('../capture/', import.meta.url);
const film = '../review/thanksgiving-comes-to-daymark-draft.mp4';
const cover = '../review/thanksgiving-comes-to-daymark-cover-draft.png';
const html = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { box-sizing: border-box } body { margin:0; background:#14151a; color:#fff; font:13px sans-serif }
main { position:relative; width:100% } video,img { display:block; width:100%; height:auto }
[hidden] { display:none } aside { position:absolute; bottom:0; width:100%; height:40px;
display:flex; align-items:center; gap:10px; padding:0 12px; background:rgba(0,0,0,.75) }
i { flex:1; height:3px; background:#b7bac1 }
</style><main><video muted playsinline preload="auto"></video><img hidden alt="">
<aside aria-label="Simulated playback controls"><span>▶</span><i></i><span>0:36</span></aside></main>`;
const browser = await chromium.launch({
	executablePath: process.env.DEMO_CHROMIUM_PATH || '/usr/bin/google-chrome'
});
try {
	const results = [];
	for (const width of [360, 390]) {
		const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
		await page.setContent(html);
		for (const [selector, path, type] of [
			['video', film, 'video/mp4'],
			['img', cover, 'image/png']
		]) {
			const data = await readFile(new URL(path, import.meta.url), 'base64');
			await page.locator(selector).evaluate(
				(el, { data, type }) => {
					const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
					el.src = URL.createObjectURL(new Blob([bytes], { type }));
				},
				{ data, type }
			);
		}
		const player = page.locator('main');
		const video = page.locator('video');
		await page.waitForFunction(() => document.querySelector('video').readyState >= 3);
		const box = await video.boundingBox();
		assert.equal(box.width, width);
		assert.equal(box.height, width * 1.25);
		// Play the entire encoded file muted at normal speed, recording one proof per second.
		const playback = await video.evaluate(async (v, width) => {
			const canvas = document.createElement('canvas');
			canvas.width = 6 * width;
			const height = Math.round(width * 1.25);
			canvas.height = 6 * height;
			const ctx = canvas.getContext('2d'),
				seen = [];
			const sample = (_, metadata) => {
				const second = Math.floor(metadata.mediaTime);
				if (second < 36 && !seen.includes(second)) {
					ctx.drawImage(v, (second % 6) * width, Math.floor(second / 6) * height, width, height);
					seen.push(second);
				}
				if (!v.ended) v.requestVideoFrameCallback(sample);
			};
			v.requestVideoFrameCallback(sample);
			const end = new Promise((resolve, reject) => {
				v.addEventListener('ended', resolve, { once: true });
				v.addEventListener('error', () => reject(Error(v.error.message)), { once: true });
			});
			await v.play();
			await end;
			return {
				proof: canvas.toDataURL('image/jpeg', 0.93).split(',')[1],
				seen,
				muted: v.muted,
				duration: v.duration,
				rate: v.playbackRate
			};
		}, width);
		assert.equal(playback.seen.length, 36);
		assert.equal(playback.rate, 1);
		assert(playback.muted && playback.duration === 36);
		await writeFile(
			new URL('playback-' + width + '.jpg', capture),
			Buffer.from(playback.proof, 'base64')
		);
		for (const [label, t] of [
			['open', 1],
			['day', 9],
			['strike', 22.5333],
			['caption', 29],
			['end', 35.5]
		]) {
			await video.evaluate(
				(v, t) =>
					new Promise((resolve) => {
						v.addEventListener(
							'seeked',
							() => requestAnimationFrame(() => requestAnimationFrame(resolve)),
							{ once: true }
						);
						v.currentTime = t;
					}),
				t
			);
			await player.screenshot({
				path: fileURLToPath(new URL(label + '-' + width + '.png', capture))
			});
		}
		await page.evaluate(() => {
			document.querySelector('video').hidden = true;
			document.querySelector('img').hidden = false;
		});
		await page.locator('img').evaluate((el) => el.decode());
		await player.screenshot({ path: fileURLToPath(new URL('cover-' + width + '.png', capture)) });
		results.push({
			width,
			height: box.height,
			playbackSeconds: playback.duration,
			sampledSeconds: playback.seen.length,
			controlsHeight: 40
		});
		await page.close();
	}
	await writeFile(new URL('mobile.json', capture), JSON.stringify(results, null, 2));
	console.log(results);
} finally {
	await browser.close();
}
