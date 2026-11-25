import { describe, expect, it } from 'vitest';
import { currentForecastDay, futureForecastDays } from './weatherForecast';

describe('forecast day alignment', () => {
	it('does not show future extrema as current when the local date is missing', () => {
		const rows = [{ date: '2026-11-02' }, { date: '2026-11-03' }];
		expect(
			currentForecastDay(rows, 'America/Chicago', new Date('2026-11-02T02:00:00Z'))
		).toBeUndefined();
	});
	it('keeps the first forecast row when the current local day was omitted', () => {
		const rows = [{ date: '2026-11-02' }, { date: '2026-11-03' }];
		expect(futureForecastDays(rows, 'America/Chicago', new Date('2026-11-02T02:00:00Z'))).toEqual(
			rows
		);
	});
	it('excludes the current local day during the fall DST transition', () => {
		const rows = [{ date: '2026-11-01' }, { date: '2026-11-02' }];
		expect(futureForecastDays(rows, 'America/Chicago', new Date('2026-11-01T07:30:00Z'))).toEqual(
			rows.slice(1)
		);
	});
});
