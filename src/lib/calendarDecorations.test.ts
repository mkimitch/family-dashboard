import { describe, expect, it } from 'vitest';
import {
	getCalendarDecoration,
	getDiwaliIntensity,
	parseCalendarPreviewDate
} from './calendarDecorations';
import { resolveCalendarDisplayRange } from './calendarDisplay';

describe('calendar day decorations', () => {
	it.each([
		[6, 'subtle'],
		[7, 'subtle'],
		[8, 'full'],
		[9, 'moderate'],
		[10, 'moderate']
	] as const)('decorates November %i with %s intensity', (day, intensity) => {
		for (const hour of [0, 12, 23]) {
			const date = new Date(2026, 10, day, hour, 59);
			expect(getCalendarDecoration(date)).toBe('diwali');
			expect(getDiwaliIntensity(date)).toBe(intensity);
		}
	});

	it('supports separately configured years, month boundaries, and a noncentral main day', () => {
		// Synthetic configuration verifies the mechanism; these are not festival dates.
		const festivals = [{ startDate: '2035-10-30', mainDate: '2035-11-02', endDate: '2035-11-03' }];
		for (const date of [new Date(2035, 9, 30), new Date(2035, 9, 31), new Date(2035, 10, 1)]) {
			expect(getDiwaliIntensity(date, festivals)).toBe('subtle');
		}
		expect(getDiwaliIntensity(new Date(2035, 10, 2), festivals)).toBe('full');
		expect(getDiwaliIntensity(new Date(2035, 10, 3), festivals)).toBe('moderate');
		for (const date of [new Date(2035, 9, 29), new Date(2035, 10, 4), new Date(2036, 10, 2)]) {
			expect(getDiwaliIntensity(date, festivals)).toBeNull();
		}
		expect(getDiwaliIntensity(new Date(2026, 10, 8), festivals)).toBeNull();
		expect(getDiwaliIntensity(new Date(2026, 10, 8), [])).toBeNull();
	});

	it.each([0, 12, 23])('matches Diwali on its local civil date at hour %i', (hour) => {
		expect(getCalendarDecoration(new Date(2026, 10, 8, hour, 59))).toBe('diwali');
	});

	it.each([
		new Date(2026, 10, 5),
		new Date(2026, 10, 11),
		new Date(2025, 10, 8),
		new Date(2027, 10, 8),
		new Date(2028, 10, 8)
	])('does not repeat Diwali on adjacent dates or unconfigured years (%s)', (date) => {
		expect(getCalendarDecoration(date)).toBeNull();
		expect(getDiwaliIntensity(date)).toBeNull();
	});

	it('decorates the visible Diwali date before the holiday, alongside Halloween', () => {
		const range = resolveCalendarDisplayRange(new Date(2026, 9, 30), {
			weeks: 3,
			anchor: 'rolling'
		});
		expect(range.days.map(getCalendarDecoration).filter(Boolean)).toEqual([
			'halloween',
			'diwali',
			'diwali',
			'diwali',
			'diwali',
			'diwali'
		]);
	});

	it.each([2026, 2027, 2028, 2035])('matches October 31 throughout %i', (year) => {
		for (const hour of [0, 12, 23]) {
			expect(getCalendarDecoration(new Date(year, 9, 31, hour, 59))).toBe('halloween');
		}
	});

	it('decorates only October 31 in a week crossing into November', () => {
		const range = resolveCalendarDisplayRange(new Date(2026, 9, 28), {
			weeks: 1,
			anchor: 'rolling'
		});
		expect(range.days.map(getCalendarDecoration)).toEqual([
			null,
			null,
			null,
			'halloween',
			null,
			null,
			null
		]);
	});

	it.each([new Date(2026, 5, 1), new Date(2026, 11, 28)])(
		'leaves unrelated weeks and year boundaries undecorated (%s)',
		(start) => {
			const range = resolveCalendarDisplayRange(start, { weeks: 3, anchor: 'rolling' });
			expect(range.days.every((date) => getCalendarDecoration(date) === null)).toBe(true);
		}
	);

	it('rejects invalid dates', () => {
		expect(getCalendarDecoration(new Date(NaN))).toBeNull();
		expect(getDiwaliIntensity(new Date(NaN))).toBeNull();
	});
});

describe('development calendar preview', () => {
	it('parses a local civil date without a UTC conversion', () => {
		const date = parseCalendarPreviewDate('2027-10-31');
		expect(date).toEqual(new Date(2027, 9, 31));
		expect(getCalendarDecoration(date!)).toBe('halloween');
	});

	it.each([null, '', '2026-02-30', '2026-13-01', '2026-10-31T00:00:00Z', 'junk'])(
		'ignores invalid preview input %s',
		(value) => expect(parseCalendarPreviewDate(value)).toBeNull()
	);
});
