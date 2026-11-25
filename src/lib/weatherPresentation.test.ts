import { describe, expect, it } from 'vitest';
import { presentWeatherCondition } from './weatherPresentation';

describe('condition presentation', () => {
	it('uses sleet art for ice pellets and retains precise terminology', () => {
		const row = {
			conditions: {
				daytime: {
					context: 'daytime',
					status: 'known',
					phenomena: [{ kind: 'ice_pellets', intensity: 'light' }],
					cloudCover: { classes: ['mostly_cloudy'] },
					description: 'Light ice pellets'
				}
			}
		};
		const result = presentWeatherCondition(row, 1, 'daytime');
		expect(result.path).toBe('/lottie/weather/overcast-day-sleet.json');
		expect(result.description).toBe('Light ice pellets');
		expect(result.approximation).toContain('ice pellets');
	});

	it('uses the supplied solar period ahead of the provider light hint', () => {
		const row = {
			conditions: {
				current: {
					context: 'current',
					status: 'known',
					phenomena: [],
					cloudCover: { classes: ['clear'] },
					description: 'Clear sky',
					lightHint: 'day'
				}
			}
		};
		expect(presentWeatherCondition(row, 1, 'current', 'night').path).toBe(
			'/lottie/weather/clear-night.json'
		);
	});

	it('does not fall through to a legacy guess for missing data in a supported response', () => {
		const row = { condition: { code: 800, icon: '01d' }, conditions: { fullDay: null } };
		expect(presentWeatherCondition(row, 1, 'fullDay').path).toContain('not-available');
		expect(presentWeatherCondition(row, 8, 'fullDay').path).toContain('clear-day');
	});

	it('does not assign a dominant cloud class for mixed sky coverage', () => {
		const row = {
			conditions: {
				fullDay: {
					context: 'fullDay',
					status: 'known',
					phenomena: [],
					cloudCover: { classes: ['mostly_clear', 'partly_cloudy'] },
					description: 'Partly cloudy and mostly clear'
				}
			}
		};
		const result = presentWeatherCondition(row, 1, 'fullDay');
		expect(result.path).toContain('/cloudy.json');
		expect(result.description).toBe('Partly cloudy and mostly clear');
	});
});

describe('shared backend catalog', () => {
	it('resolves a bundled asset for every gallery condition in all supported lighting contexts', async () => {
		const { existsSync } = await import('node:fs');
		const { default: fixture } = await import('./server/fixtures/weather-contract-v1.json');
		const contexts = ['current', 'hourly', 'fullDay', 'daytime', 'nighttime'] as const;
		const lights = ['day', 'night', undefined] as const;
		for (const row of fixture.rows) {
			for (const context of contexts) {
				for (const light of lights) {
					const view = presentWeatherCondition(
						{ conditions: { [context]: { ...row, context } } },
						fixture.conditionSchemaVersion,
						context,
						light
					);
					const asset = new URL(`../../static${view.path}`, import.meta.url);
					expect(
						existsSync(asset),
						`${row.source.provider}/${row.source.native[0]?.code}/${view.path}`
					).toBe(true);
					if (row.status === 'unknown') expect(view.path).toContain('/not-available.json');
					else expect(view.path).not.toContain('/not-available.json');
				}
			}
		}
	});

	it('rejects unknown legacy numeric codes and malformed icon tokens', () => {
		expect(
			presentWeatherCondition({ condition: { id: 530 } }, undefined, 'fullDay').path
		).toContain('not-available');
		expect(
			presentWeatherCondition({ condition: { icon: '10garbagen' } }, undefined, 'fullDay').path
		).toContain('not-available');
	});
});

it('uses a reported cloud percentage for artwork without imposing a dominant mixed sky', () => {
	const row = {
		context: 'current',
		status: 'known',
		phenomena: [{ kind: 'rain', intensity: 'light' }],
		cloudCover: { classes: [], percent: 93, mixed: false },
		description: 'Light rain'
	};
	expect(
		presentWeatherCondition({ conditions: { current: row } }, 1, 'current', 'night').path
	).toContain('/overcast-night-rain.json');
	const mixed = { ...row, cloudCover: { classes: ['overcast'], percent: 93, mixed: true } };
	expect(
		presentWeatherCondition({ conditions: { current: mixed } }, 1, 'current', 'night').path
	).toContain('/rain.json');
});

it('renders the bounded Tomorrow sky codes and qualified ice pellets on legacy responses', () => {
	for (const [code, slug] of [
		[1100, 'partly-cloudy-night'],
		[1101, 'partly-cloudy-night'],
		[1102, 'cloudy']
	] as const) {
		expect(
			presentWeatherCondition(
				{ condition: { code }, _sources: { condition: 'tomorrow' } },
				undefined,
				'current',
				'night'
			).path
		).toBe(`/lottie/weather/${slug}.json`);
	}
	expect(
		presentWeatherCondition({ condition: { desc: 'Light ice pellets' } }, undefined, 'fullDay').path
	).toBe('/lottie/weather/sleet.json');
});
