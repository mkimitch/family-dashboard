import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	alertIconPath,
	beaufortLevelOf,
	pressureIconPath,
	uvIconPath,
	weatherConditionIconPath,
	weatherConditionIconSlug,
	windIconPath
} from './weatherIcons';
import { describe, expect, it } from 'vitest';

const weatherAssetPath = (publicPath: string): string =>
	fileURLToPath(new URL(`../../static${publicPath}`, import.meta.url));

describe('weather condition icons', () => {
	it.each([
		[{ id: 800, icon: '01d', main: 'Clear' }, 'clear-day'],
		[{ id: 800, icon: '01n', main: 'Clear' }, 'clear-night'],
		[{ id: 801, icon: '02n', main: 'Clouds' }, 'partly-cloudy-night'],
		[{ id: 802, icon: '03d', main: 'Clouds' }, 'cloudy'],
		[{ id: 804, icon: '04d', main: 'Clouds' }, 'overcast-day'],
		[{ id: 300, icon: '09d', main: 'Drizzle' }, 'partly-cloudy-day-drizzle'],
		[{ id: 301, icon: '09d', main: 'Drizzle' }, 'overcast-day-drizzle'],
		[{ id: 500, icon: '10n', main: 'Rain' }, 'partly-cloudy-night-rain'],
		[{ id: 502, icon: '10d', description: 'heavy intensity rain' }, 'extreme-day-rain'],
		[{ id: 511, icon: '13n', main: 'Freezing rain' }, 'overcast-night-sleet'],
		[{ id: 600, icon: '13d', main: 'Snow' }, 'partly-cloudy-day-snow'],
		[{ id: 602, icon: '13n', description: 'heavy snow' }, 'extreme-night-snow'],
		[
			{ id: 202, icon: '11d', description: 'thunderstorm with heavy rain' },
			'thunderstorms-day-extreme-rain'
		],
		[
			{ id: 230, icon: '11n', description: 'thunderstorm with light drizzle' },
			'thunderstorms-night-rain'
		],
		[{ id: 701, icon: '50d', main: 'Mist' }, 'mist'],
		[{ id: 711, icon: '50n', main: 'Smoke' }, 'smoke'],
		[{ id: 721, icon: '50d', main: 'Haze' }, 'haze-day'],
		[{ id: 731, icon: '50n', description: 'sand/dust whirls' }, 'dust-night'],
		[{ id: 741, icon: '50d', main: 'Fog' }, 'fog-day'],
		[{ id: 762, icon: '50n', description: 'volcanic ash' }, 'extreme-night-smoke'],
		[{ id: 771, icon: '50d', main: 'Squall' }, 'wind-alert'],
		[{ id: 781, icon: '50d', main: 'Tornado' }, 'tornado'],
		[{ icon: '01d', description: 'sunny' }, 'clear-day'],
		[{ icon: '04n', main: 'Clouds' }, 'overcast-night'],
		[{ icon: '09d', description: 'light drizzle' }, 'overcast-day-drizzle'],
		[{ icon: '50n', description: 'overcast fog' }, 'overcast-night-fog'],
		[{ icon: '11n', description: 'thunderstorms and snow' }, 'thunderstorms-night-snow'],
		[{ code: '10n' }, 'partly-cloudy-night-rain'],
		[{ icon: '13d' }, 'overcast-day-snow']
	])('maps %j to %s', (condition, expected) => {
		expect(weatherConditionIconSlug(condition)).toBe(expected);
	});

	it('uses an honest unavailable fallback for missing or unknown conditions', () => {
		expect(weatherConditionIconSlug(undefined)).toBe('not-available');
		expect(weatherConditionIconSlug({ main: 'Unknown' })).toBe('not-available');
	});
});

describe('weather measurement and alert icons', () => {
	it.each([
		[0, 0],
		[1, 1],
		[3, 1],
		[4, 2],
		[18, 4],
		[24, 5],
		[73, 12]
	])('maps %s mph to Beaufort force %s', (mph, expected) => {
		expect(beaufortLevelOf(mph)).toBe(expected);
	});

	it('selects pressure, UV, and wind variants', () => {
		expect(pressureIconPath(998)).toContain('pressure-low.json');
		expect(pressureIconPath(1013)).toContain('barometer.json');
		expect(pressureIconPath(1030)).toContain('pressure-high.json');
		expect(uvIconPath(7.6)).toContain('uv-index-8.json');
		expect(windIconPath(40)).toContain('wind-beaufort-8.json');
	});

	it('uses hazard-specific alert art before severity colors', () => {
		expect(alertIconPath('warning', 'Tornado warning')).toContain('tornado.json');
		expect(alertIconPath('warning', 'Hurricane warning')).toContain('flag-hurricane-warning.json');
		expect(alertIconPath('advisory', 'Small craft advisory')).toContain(
			'flag-small-craft-advisory.json'
		);
		expect(alertIconPath('warning', 'Flood warning')).toContain('code-red.json');
	});
});

describe('weather icon asset integrity', () => {
	it('has an asset for every OpenWeather condition ID in day and night modes', () => {
		const ids = [
			200, 201, 202, 210, 211, 212, 221, 230, 231, 232, 300, 301, 302, 310, 311, 312, 313, 314, 321,
			500, 501, 502, 503, 504, 511, 520, 521, 522, 531, 600, 601, 602, 611, 612, 613, 615, 616, 620,
			621, 622, 701, 711, 721, 731, 741, 751, 761, 762, 771, 781, 800, 801, 802, 803, 804
		];

		for (const id of ids) {
			for (const period of ['d', 'n']) {
				const path = weatherConditionIconPath({ id, icon: `01${period}` });
				expect(existsSync(weatherAssetPath(path)), `${id}/${period}: ${path}`).toBe(true);
			}
		}
	});

	it('has assets for every descriptive cloud-cover and precipitation combination', () => {
		const conditions = ['drizzle', 'fog', 'hail', 'haze', 'rain', 'sleet', 'smoke', 'snow'];
		const covers = ['', 'partly cloudy ', 'overcast ', 'extreme '];

		for (const condition of conditions) {
			for (const cover of covers) {
				for (const period of ['d', 'n']) {
					const path = weatherConditionIconPath({
						icon: `01${period}`,
						description: `${cover}${condition}`
					});
					expect(
						existsSync(weatherAssetPath(path)),
						`${cover}${condition}/${period}: ${path}`
					).toBe(true);
				}
			}
		}
	});

	it('resolves every selected icon to a bundled Lottie file', () => {
		const paths = [
			weatherConditionIconPath({ id: 202, icon: '11d', main: 'Thunderstorm' }),
			weatherConditionIconPath({ id: 511, icon: '13n', main: 'Freezing rain' }),
			weatherConditionIconPath({ id: 762, icon: '50d', main: 'Ash' }),
			weatherConditionIconPath({ id: 999, main: 'Unknown' }),
			...[0, 1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73].map(windIconPath),
			...Array.from({ length: 12 }, (_, level) => uvIconPath(level)),
			alertIconPath('warning', 'Avalanche warning'),
			alertIconPath('warning', 'Falling rock warning'),
			alertIconPath('watch', 'Gale watch')
		];

		for (const path of paths) expect(existsSync(weatherAssetPath(path)), path).toBe(true);
	});
});
