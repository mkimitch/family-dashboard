import { describe, expect, it } from 'vitest';
import { formatWeatherProbability } from './weatherProbability';

describe('weather probability labels', () => {
	it.each([
		[0, 'daily', '0%'],
		[0.35, 'precipitationProbabilityAvg', 'Avg 35%'],
		[1, 'precipitationProbabilityMax', 'Max 100%'],
		[0.35, 'precipitationProbability', '35%?'],
		[0.35, 'future-basis', '35%?'],
		[null, 'daily', '—'],
		[undefined, undefined, '—'],
		[-0.1, 'daily', '—'],
		[35, 'daily', '—'],
		[NaN, 'daily', '—'],
		[Infinity, 'daily', '—'],
		['0.35', 'daily', '—']
	])('formats %s with basis %s as %s', (pop, popBasis, label) => {
		expect(formatWeatherProbability({ pop, popBasis }).label).toBe(label);
	});

	it('accepts explicit legacy percent only when pop is absent', () => {
		expect(formatWeatherProbability({ precipPct: 35 }, true).label).toBe('35%?');
		expect(formatWeatherProbability({ pop: null, precipPct: 35 }, true).label).toBe('—');
		expect(formatWeatherProbability({ precipPct: 35 }).label).toBe('—');
	});
});
