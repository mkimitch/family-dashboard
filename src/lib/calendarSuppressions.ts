import { DATE_TIME_APP_DEFAULTS } from '$lib/config/dateTime';
import type { CalendarSuppression, CalEvent, CalInfo } from '$lib/config/types';

export type ActiveCalendarSuppression = {
	suppression: CalendarSuppression;
	disabledFrom: Date | null;
	disabledUntil: Date | null;
	legendLabel: string;
	titleLabel: string;
};

const DEFAULT_TIME_ZONE = DATE_TIME_APP_DEFAULTS.timeZone;
const EXPLICIT_ZONE_RE = /(?:z|[+-]\d{2}:?\d{2})$/i;
const LOCAL_DATE_TIME_RE =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?)?$/;

const normalizeMatchValue = (value: string | null | undefined): string =>
	(value ?? '').trim().toLocaleLowerCase();

const hasValue = (value: string | null | undefined): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const toMilliseconds = (fraction: string | undefined): number => {
	if (!fraction) return 0;
	return Number(fraction.padEnd(3, '0').slice(0, 3));
};

const getTimeZoneParts = (
	date: Date,
	timeZone: string
): {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
} => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(date);
	const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);

	return {
		year: value('year'),
		month: value('month'),
		day: value('day'),
		hour: value('hour'),
		minute: value('minute'),
		second: value('second')
	};
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string): number => {
	const parts = getTimeZoneParts(date, timeZone);
	const zonedAsUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second
	);
	return zonedAsUtc - date.getTime();
};

const makeDateInTimeZone = (
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	timeZone: string
): Date => {
	const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);

	try {
		let offset = getTimeZoneOffsetMs(
			new Date(Date.UTC(year, month - 1, day, hour, minute, second)),
			timeZone
		);
		let instant = localAsUtc - offset;
		const adjustedOffset = getTimeZoneOffsetMs(new Date(instant), timeZone);
		if (adjustedOffset !== offset) {
			offset = adjustedOffset;
			instant = localAsUtc - offset;
		}
		return new Date(instant);
	} catch {
		return new Date(year, month - 1, day, hour, minute, second, millisecond);
	}
};

export const parseSuppressionDateTime = (
	value: string | null | undefined,
	timeZone: string = DEFAULT_TIME_ZONE
): Date | null => {
	if (!hasValue(value)) return null;
	const raw = value.trim();
	if (EXPLICIT_ZONE_RE.test(raw)) {
		const parsed = new Date(raw);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	const match = raw.match(LOCAL_DATE_TIME_RE);
	if (!match) {
		const parsed = new Date(raw);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	return makeDateInTimeZone(
		Number(match[1]),
		Number(match[2]),
		Number(match[3]),
		Number(match[4] ?? 0),
		Number(match[5] ?? 0),
		Number(match[6] ?? 0),
		toMilliseconds(match[7]),
		timeZone
	);
};

const calendarMatchesSuppression = (
	calendar: CalInfo,
	suppression: CalendarSuppression
): boolean => {
	if (hasValue(suppression.calendarId)) {
		const id = normalizeMatchValue(suppression.calendarId);
		if (normalizeMatchValue(calendar.id) === id) return true;
	}

	if (hasValue(suppression.calendarName)) {
		const name = normalizeMatchValue(suppression.calendarName);
		return normalizeMatchValue(calendar.name) === name || normalizeMatchValue(calendar.id) === name;
	}

	return false;
};

const isSuppressionActive = (
	suppression: CalendarSuppression,
	now: Date,
	timeZone: string
): {
	active: boolean;
	disabledFrom: Date | null;
	disabledUntil: Date | null;
} => {
	const disabledFrom = parseSuppressionDateTime(suppression.disabledFrom, timeZone);
	const disabledUntil = parseSuppressionDateTime(suppression.disabledUntil, timeZone);

	if (hasValue(suppression.disabledFrom) && !disabledFrom) {
		return { active: false, disabledFrom: null, disabledUntil };
	}
	if (hasValue(suppression.disabledUntil) && !disabledUntil) {
		return { active: false, disabledFrom, disabledUntil: null };
	}
	if (disabledFrom && now < disabledFrom) {
		return { active: false, disabledFrom, disabledUntil };
	}
	if (disabledUntil && now >= disabledUntil) {
		return { active: false, disabledFrom, disabledUntil };
	}

	return { active: true, disabledFrom, disabledUntil };
};

const isMidnightInTimeZone = (date: Date, timeZone: string): boolean => {
	const parts = getTimeZoneParts(date, timeZone);
	return parts.hour === 0 && parts.minute === 0 && parts.second === 0;
};

export const formatSuppressionUntil = (
	disabledUntil: Date,
	timeZone: string = DEFAULT_TIME_ZONE
): string => {
	const includeTime = !isMidnightInTimeZone(disabledUntil, timeZone);
	const options: Intl.DateTimeFormatOptions = {
		timeZone,
		month: 'short',
		day: 'numeric'
	};
	if (includeTime) {
		options.hour = 'numeric';
		options.minute = '2-digit';
	}
	return new Intl.DateTimeFormat('en-US', options).format(disabledUntil);
};

const buildSuppressionStatus = (
	suppression: CalendarSuppression,
	disabledFrom: Date | null,
	disabledUntil: Date | null,
	timeZone: string
): ActiveCalendarSuppression => {
	const untilText = disabledUntil ? formatSuppressionUntil(disabledUntil, timeZone) : null;
	const legendLabel = suppression.label ?? (untilText ? `Paused until ${untilText}` : 'Paused');
	const reason = suppression.reason?.trim();
	const titleLabel = reason ? `${legendLabel}. ${reason}` : legendLabel;

	return {
		suppression,
		disabledFrom,
		disabledUntil,
		legendLabel,
		titleLabel
	};
};

export const getCalendarSuppressionStatus = (
	calendar: CalInfo,
	suppressions: CalendarSuppression[],
	now: Date,
	timeZone: string = DEFAULT_TIME_ZONE
): ActiveCalendarSuppression | null => {
	for (const suppression of suppressions) {
		if (!calendarMatchesSuppression(calendar, suppression)) continue;
		const { active, disabledFrom, disabledUntil } = isSuppressionActive(suppression, now, timeZone);
		if (active) return buildSuppressionStatus(suppression, disabledFrom, disabledUntil, timeZone);
	}
	return null;
};

export const getSuppressedCalendarAriaLabel = (
	calendar: CalInfo,
	status: ActiveCalendarSuppression
): string => {
	const name = calendar.name || calendar.id;
	const reason = status.suppression.reason?.trim();
	const reasonText = reason ? ` ${reason}.` : '';
	return `${name}, ${status.legendLabel}; events hidden.${reasonText}`;
};

const calendarForEvent = (event: CalEvent, calendars: Map<string, CalInfo>): CalInfo | null => {
	const id = (event.calendarId ?? '').trim();
	const existing = id ? calendars.get(id) : undefined;
	if (existing) return existing;
	if (!id && !event.calendarName) return null;
	return {
		id,
		name: event.calendarName ?? id
	};
};

export const isCalendarSuppressed = (
	calendar: CalInfo,
	suppressions: CalendarSuppression[],
	now: Date,
	timeZone: string = DEFAULT_TIME_ZONE
): boolean => getCalendarSuppressionStatus(calendar, suppressions, now, timeZone) !== null;

export const filterSuppressedEvents = (
	events: CalEvent[],
	calendars: Map<string, CalInfo>,
	suppressions: CalendarSuppression[],
	now: Date,
	timeZone: string = DEFAULT_TIME_ZONE
): CalEvent[] => {
	if (!suppressions.length) return [...events];

	return events.filter((event) => {
		const calendar = calendarForEvent(event, calendars);
		if (!calendar) return true;
		return !isCalendarSuppressed(calendar, suppressions, now, timeZone);
	});
};
