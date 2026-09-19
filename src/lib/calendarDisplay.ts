import type { CalendarDisplayConfig } from '$lib/config/types';

export const DEFAULT_CALENDAR_DISPLAY_CONFIG: CalendarDisplayConfig = {
	weeks: 1,
	anchor: 'rolling'
};

export type CalendarDisplayRange = {
	start: Date;
	endExclusive: Date;
	days: Date[];
	weekRows: Date[][];
};

const addDays = (date: Date, count: number): Date => {
	const next = new Date(date);
	next.setDate(next.getDate() + count);
	return next;
};

export const resolveCalendarDisplayConfig = (value: unknown): CalendarDisplayConfig => {
	if (!value || typeof value !== 'object') return { ...DEFAULT_CALENDAR_DISPLAY_CONFIG };

	const candidate = value as Record<string, unknown>;
	if (
		(candidate.weeks !== 1 && candidate.weeks !== 2 && candidate.weeks !== 3) ||
		candidate.anchor !== 'rolling'
	) {
		return { ...DEFAULT_CALENDAR_DISPLAY_CONFIG };
	}

	return {
		weeks: candidate.weeks,
		anchor: candidate.anchor
	};
};

export const resolveCalendarDisplayRange = (
	now: Date,
	config: CalendarDisplayConfig
): CalendarDisplayRange => {
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dayCount = config.weeks * 7;
	const days = Array.from({ length: dayCount }, (_, index) => addDays(start, index));
	const weekRows = Array.from({ length: config.weeks }, (_, index) =>
		days.slice(index * 7, index * 7 + 7)
	);

	return {
		start,
		endExclusive: addDays(start, dayCount),
		days,
		weekRows
	};
};
