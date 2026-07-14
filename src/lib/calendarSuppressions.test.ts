import type { CalendarSuppression, CalEvent, CalInfo } from '$lib/config/types';
import {
	filterSuppressedEvents,
	getCalendarSuppressionStatus,
	getSuppressedCalendarAriaLabel
} from './calendarSuppressions';
import { describe, expect, it } from 'vitest';

const timeZone = 'America/Chicago';
const suppressions: CalendarSuppression[] = [
	{
		calendarName: "Smruti's Work",
		disabledUntil: '2026-07-29T00:00:00',
		reason: 'Temporarily hidden'
	}
];
const calendars = new Map<string, CalInfo>([
	['smruti-work', { id: 'smruti-work', name: "Smruti's Work", color: '#888' }],
	['family', { id: 'family', name: 'Family', color: '#666' }]
]);
const events: CalEvent[] = [
	{
		id: 'work-timed',
		title: 'Work timed event',
		start: new Date('2026-07-28T10:00:00-05:00'),
		calendarId: 'smruti-work'
	},
	{
		id: 'work-allday',
		title: 'Work all-day event',
		start: new Date('2026-07-28T00:00:00-05:00'),
		end: new Date('2026-07-29T00:00:00-05:00'),
		calendarId: 'smruti-work',
		allDay: true
	},
	{
		id: 'family-event',
		title: 'Family event',
		start: new Date('2026-07-28T18:00:00-05:00'),
		calendarId: 'family'
	}
];

describe('calendar suppressions', () => {
	it('hides Smruti work events before the disabled-until boundary', () => {
		const visible = filterSuppressedEvents(
			events,
			calendars,
			suppressions,
			new Date('2026-07-28T12:00:00-05:00'),
			timeZone
		);

		expect(visible.map((event) => event.id)).toEqual(['family-event']);
	});

	it('shows Smruti work events on and after the re-enable boundary', () => {
		const atBoundary = filterSuppressedEvents(
			events,
			calendars,
			suppressions,
			new Date('2026-07-29T00:00:00-05:00'),
			timeZone
		);
		const afterBoundary = filterSuppressedEvents(
			events,
			calendars,
			suppressions,
			new Date('2026-07-29T00:01:00-05:00'),
			timeZone
		);

		expect(atBoundary.map((event) => event.id)).toEqual([
			'work-timed',
			'work-allday',
			'family-event'
		]);
		expect(afterBoundary.map((event) => event.id)).toEqual([
			'work-timed',
			'work-allday',
			'family-event'
		]);
	});

	it('keeps the suppressed calendar available for the legend', () => {
		const names = Array.from(calendars.values()).map((calendar) => calendar.name);
		const status = getCalendarSuppressionStatus(
			calendars.get('smruti-work')!,
			suppressions,
			new Date('2026-07-28T12:00:00-05:00'),
			timeZone
		);

		expect(names).toContain("Smruti's Work");
		expect(status?.legendLabel).toBe('Paused until Jul 29');
	});

	it('provides accessible paused legend text without relying on color alone', () => {
		const calendar = calendars.get('smruti-work')!;
		const status = getCalendarSuppressionStatus(
			calendar,
			suppressions,
			new Date('2026-07-28T12:00:00-05:00'),
			timeZone
		);

		expect(status).not.toBeNull();
		expect(getSuppressedCalendarAriaLabel(calendar, status!)).toBe(
			"Smruti's Work, Paused until Jul 29; events hidden. Temporarily hidden."
		);
	});
});
