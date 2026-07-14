import type { CalendarDisplayConfig } from '$lib/config/types';
import {
	DEFAULT_CALENDAR_DISPLAY_CONFIG,
	resolveCalendarDisplayConfig,
	resolveCalendarDisplayRange
} from './calendarDisplay';
import { describe, expect, it } from 'vitest';

const dateKey = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

describe('calendar display configuration', () => {
	it('accepts the supported one- and two-week rolling modes', () => {
		expect(resolveCalendarDisplayConfig({ weeks: 1, anchor: 'rolling' })).toEqual({
			weeks: 1,
			anchor: 'rolling'
		});
		expect(resolveCalendarDisplayConfig({ weeks: 2, anchor: 'rolling' })).toEqual({
			weeks: 2,
			anchor: 'rolling'
		});
	});

	it.each([
		undefined,
		null,
		{},
		{ weeks: 0, anchor: 'rolling' },
		{ weeks: 3, anchor: 'rolling' },
		{ weeks: '2', anchor: 'rolling' },
		{ weeks: 2, anchor: 'week-aligned' }
	])('falls back safely for unsupported input %#', (value) => {
		expect(resolveCalendarDisplayConfig(value)).toEqual(DEFAULT_CALENDAR_DISPLAY_CONFIG);
	});
});

describe('rolling calendar display range', () => {
	it.each([
		{ weeks: 1 as const, dayCount: 7 },
		{ weeks: 2 as const, dayCount: 14 }
	])('builds $weeks complete week row(s)', ({ weeks, dayCount }) => {
		const config: CalendarDisplayConfig = { weeks, anchor: 'rolling' };
		const range = resolveCalendarDisplayRange(new Date(2026, 6, 13, 15, 45), config);

		expect(dateKey(range.start)).toBe('2026-07-13');
		expect(range.start.getHours()).toBe(0);
		expect(range.days).toHaveLength(dayCount);
		expect(range.weekRows).toHaveLength(weeks);
		expect(range.weekRows.every((row) => row.length === 7)).toBe(true);
		expect(dateKey(range.endExclusive)).toBe(weeks === 1 ? '2026-07-20' : '2026-07-27');
	});

	it('stays consecutive across month and year boundaries', () => {
		const range = resolveCalendarDisplayRange(new Date(2026, 11, 28, 8), {
			weeks: 2,
			anchor: 'rolling'
		});

		expect(range.days.map(dateKey)).toEqual([
			'2026-12-28',
			'2026-12-29',
			'2026-12-30',
			'2026-12-31',
			'2027-01-01',
			'2027-01-02',
			'2027-01-03',
			'2027-01-04',
			'2027-01-05',
			'2027-01-06',
			'2027-01-07',
			'2027-01-08',
			'2027-01-09',
			'2027-01-10'
		]);
		expect(dateKey(range.endExclusive)).toBe('2027-01-11');
	});

	it('does not mutate the supplied current time', () => {
		const now = new Date(2026, 6, 13, 15, 45);
		const before = now.getTime();

		resolveCalendarDisplayRange(now, { weeks: 2, anchor: 'rolling' });

		expect(now.getTime()).toBe(before);
	});
});
