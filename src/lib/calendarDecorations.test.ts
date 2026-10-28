import { describe, expect, it } from 'vitest';
import { getCalendarDecoration, parseCalendarPreviewDate } from './calendarDecorations';
import { resolveCalendarDisplayRange } from './calendarDisplay';

describe('calendar day decorations', () => {
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
