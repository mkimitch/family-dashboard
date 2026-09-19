import { DEFAULT_CALENDAR_DISPLAY_CONFIG } from './calendarDisplay';
import { parseCalendarConfigPayload } from './calendarConfigPayload';
import { describe, expect, it } from 'vitest';

describe('calendar config payload parsing', () => {
	it('keeps legacy array payloads on the one-week default', () => {
		const legacy = [{ id: 'family', name: 'Family' }];

		expect(parseCalendarConfigPayload(legacy)).toEqual({
			overrides: legacy,
			display: DEFAULT_CALENDAR_DISPLAY_CONFIG,
			suppressions: []
		});
	});

	it('parses the configured three-week display alongside existing fields', () => {
		const suppression = { calendarName: 'Work', reason: 'Paused' };

		expect(
			parseCalendarConfigPayload({
				calendars: [{ id: 'family' }],
				calendarDisplay: { weeks: 3, anchor: 'rolling' },
				calendarSuppressions: [suppression]
			})
		).toEqual({
			overrides: [{ id: 'family' }],
			display: { weeks: 3, anchor: 'rolling' },
			suppressions: [suppression]
		});
	});

	it.each([
		undefined,
		null,
		'bad payload',
		{},
		{ calendarDisplay: { weeks: 4, anchor: 'rolling' } },
		{ calendarDisplay: { weeks: 2, anchor: 'week-aligned' } }
	])('uses safe defaults for incomplete or invalid payloads %#', (payload) => {
		expect(parseCalendarConfigPayload(payload).display).toEqual(DEFAULT_CALENDAR_DISPLAY_CONFIG);
	});

	it('preserves the legacy suppressions key', () => {
		const suppressions = [{ calendarId: 'work' }];

		expect(parseCalendarConfigPayload({ suppressions }).suppressions).toEqual(suppressions);
	});
});
