import { resolveCalendarDisplayConfig } from '$lib/calendarDisplay';
import type { CalendarConfig, CalendarDisplayConfig, CalendarSuppression } from '$lib/config/types';

type CalendarConfigObjectPayload = {
	calendars?: CalendarConfig[];
	calendarDisplay?: unknown;
	calendarSuppressions?: CalendarSuppression[];
	suppressions?: CalendarSuppression[];
};

export type ParsedCalendarConfigPayload = {
	overrides: CalendarConfig[];
	display: CalendarDisplayConfig;
	suppressions: CalendarSuppression[];
};

export const parseCalendarConfigPayload = (data: unknown): ParsedCalendarConfigPayload => {
	if (Array.isArray(data)) {
		return {
			overrides: data as CalendarConfig[],
			display: resolveCalendarDisplayConfig(undefined),
			suppressions: []
		};
	}
	if (!data || typeof data !== 'object') {
		return {
			overrides: [],
			display: resolveCalendarDisplayConfig(undefined),
			suppressions: []
		};
	}

	const payload = data as CalendarConfigObjectPayload;
	return {
		overrides: Array.isArray(payload.calendars) ? payload.calendars : [],
		display: resolveCalendarDisplayConfig(payload.calendarDisplay),
		suppressions: Array.isArray(payload.calendarSuppressions)
			? payload.calendarSuppressions
			: Array.isArray(payload.suppressions)
				? payload.suppressions
				: []
	};
};
