import type { CalendarConfig, CalendarDisplayConfig, CalendarSuppression } from './types';

export const calendarConfig: CalendarConfig[] = [];

export const calendarDisplay = {
	weeks: 2,
	anchor: 'rolling'
} satisfies CalendarDisplayConfig;

export const calendarSuppressions: CalendarSuppression[] = [
	{
		calendarName: "Smruti's Work",
		disabledUntil: '2026-07-29T00:00:00',
		reason: 'Temporarily hidden'
	}
];
