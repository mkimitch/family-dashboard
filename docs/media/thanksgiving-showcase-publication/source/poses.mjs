// Measure the real path twice at identical head/neck poses. Seeking only the wattle
// to its start gives a control outline for measuring its secondary motion in the film.
export const measurePoses = async (page) => {
	const results = [];
	for (const [label, cue, offsets] of [
		['Head tilt', 270, [0, 12, 17, 28]],
		['Double peck', 660, [0, 12, 15, 20, 24, 30, 39]]
	]) {
		const button = (name) => page.getByRole('button', { name, exact: true });
		await button(label).dispatchEvent('click');
		results.push(
			...(await page.locator('.turkey').evaluate(
				(el, { cue, offsets, label }) => {
					const list = el
						.getAnimations({ subtree: true })
						.filter((a) => a.id.startsWith('turkey-'));
					const wattle = el.querySelector('.wattle');
					const motion = wattle.getAnimations()[0];
					const { delay, duration } = motion.effect.getTiming();
					const points = (path) => {
						const matrix = path.getScreenCTM();
						const length = path.getTotalLength();
						return Array.from({ length: 96 }, (_, i) => {
							const p = path.getPointAtLength((length * i) / 96).matrixTransform(matrix);
							return [p.x, p.y];
						});
					};
					for (const a of list) a.pause();
					return offsets.map((offset) => {
						const ms = (offset * 1000) / 30;
						for (const a of list) a.currentTime = ms;
						const actual = points(wattle);
						motion.currentTime = 0;
						return {
							label,
							frame: cue + offset,
							ms,
							delay,
							duration,
							actual,
							still: points(wattle),
							feet: [...el.querySelectorAll(':scope > path')].slice(0, 2).map(points)
						};
					});
				},
				{ label, cue, offsets }
			))
		);
		await button('Stop/Reset').dispatchEvent('click');
		await page.getByText('Resting', { exact: true }).waitFor();
	}
	return results;
};
