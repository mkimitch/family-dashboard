import {
	MAX_VISIBLE_COUNTDOWNS,
	type CountdownItem,
	type CountdownVariant
} from '$lib/config/countdowns';
import type { ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
import { toDate } from '$lib/utils/dateTime';

type CalendarDate = {
	year: number;
	month: number;
	day: number;
};

type ParsedCountdownDate =
	| {
			kind: 'date-only';
			calendarDate: CalendarDate;
			sortKey: number;
	  }
	| {
			kind: 'date-time';
			date: Date;
			sortKey: number;
	  };

export type CountdownResolutionOptions = {
	now?: Date;
	dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null;
	maxVisible?: number;
};

export type ResolvedCountdownItem = {
	id: string;
	label: string;
	remainingText: string;
	targetDate: string;
	variant: CountdownVariant;
	isDateOnly: boolean;
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const calendarFormatterCache = new Map<string, Intl.DateTimeFormat>();

const pluralize = (value: number, unit: string): string =>
	`${value} ${unit}${value === 1 ? '' : 's'}`;

const joinDurationParts = (...parts: Array<string | null | undefined | false>): string => {
	const filtered = parts.filter((part): part is string => Boolean(part));
	if (filtered.length <= 1) return filtered[0] ?? '';
	return `${filtered[0]} and ${filtered[1]}`;
};

const calendarDateToDayNumber = ({ year, month, day }: CalendarDate): number =>
	Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);

const compareCalendarDates = (left: CalendarDate, right: CalendarDate): number =>
	calendarDateToDayNumber(left) - calendarDateToDayNumber(right);

const getCalendarFormatter = (timeZone: string): Intl.DateTimeFormat => {
	const cached = calendarFormatterCache.get(timeZone);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	calendarFormatterCache.set(timeZone, formatter);
	return formatter;
};

const getCalendarDatePart = (
	parts: Intl.DateTimeFormatPart[],
	type: 'year' | 'month' | 'day'
): number => Number(parts.find((part) => part.type === type)?.value ?? 0);

const getCalendarDateForInstant = (value: Date, timeZone?: string): CalendarDate => {
	if (!timeZone) {
		return {
			year: value.getFullYear(),
			month: value.getMonth() + 1,
			day: value.getDate()
		};
	}

	const parts = getCalendarFormatter(timeZone).formatToParts(value);
	return {
		year: getCalendarDatePart(parts, 'year'),
		month: getCalendarDatePart(parts, 'month'),
		day: getCalendarDatePart(parts, 'day')
	};
};

const parseCalendarDate = (value: string): CalendarDate | null => {
	const match = value.match(DATE_ONLY_RE);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const candidate = new Date(Date.UTC(year, month - 1, day));
	if (
		candidate.getUTCFullYear() !== year ||
		candidate.getUTCMonth() !== month - 1 ||
		candidate.getUTCDate() !== day
	) {
		return null;
	}

	return { year, month, day };
};

const addCalendarMonths = (value: CalendarDate, months: number): CalendarDate => {
	const anchor = new Date(Date.UTC(value.year, value.month - 1 + months, 1));
	const year = anchor.getUTCFullYear();
	const month = anchor.getUTCMonth() + 1;
	const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	return {
		year,
		month,
		day: Math.min(value.day, maxDay)
	};
};

const diffWholeCalendarMonths = (from: CalendarDate, to: CalendarDate): number => {
	let months = (to.year - from.year) * 12 + (to.month - from.month);
	if (months <= 0) return 0;
	if (compareCalendarDates(addCalendarMonths(from, months), to) > 0) {
		months -= 1;
	}
	return Math.max(0, months);
};

const formatCalendarMonthsAndDays = (from: CalendarDate, to: CalendarDate): string => {
	const totalDays = calendarDateToDayNumber(to) - calendarDateToDayNumber(from);
	if (totalDays <= 0) return 'today';
	const months = diffWholeCalendarMonths(from, to);
	if (months <= 0) return `in ${pluralize(totalDays, 'day')}`;
	const remainderDays =
		calendarDateToDayNumber(to) - calendarDateToDayNumber(addCalendarMonths(from, months));
	return `in ${joinDurationParts(pluralize(months, 'month'), remainderDays > 0 && pluralize(remainderDays, 'day'))}`;
};

const formatWeeksAndDays = (days: number): string => {
	const weeks = Math.floor(days / 7);
	const remainderDays = days % 7;
	if (weeks <= 0) return `in ${pluralize(days, 'day')}`;
	if (days > 35 && remainderDays >= 4) return `in ${pluralize(days, 'day')}`;
	return `in ${joinDurationParts(pluralize(weeks, 'week'), remainderDays > 0 && pluralize(remainderDays, 'day'))}`;
};

const formatHoursAndMinutes = (durationMs: number): string => {
	const totalMinutes = Math.max(1, Math.ceil(durationMs / MINUTE_MS));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours <= 0) return `in ${pluralize(totalMinutes, 'minute')}`;
	return `in ${joinDurationParts(pluralize(hours, 'hour'), minutes > 0 && pluralize(minutes, 'minute'))}`;
};

const formatDaysAndHours = (durationMs: number): string => {
	const totalHours = Math.max(1, Math.floor(durationMs / HOUR_MS));
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;
	if (days <= 0) return `in ${pluralize(totalHours, 'hour')}`;
	return `in ${joinDurationParts(pluralize(days, 'day'), hours > 0 && pluralize(hours, 'hour'))}`;
};

const parseDisplayTimeZone = (
	dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null
): string | undefined => dateTimeDisplay?.timeZone;

const getParsedTargetCalendarDate = (
	value: ParsedCountdownDate,
	timeZone?: string
): CalendarDate =>
	value.kind === 'date-only' ? value.calendarDate : getCalendarDateForInstant(value.date, timeZone);

const isBeforeWindowStart = (
	value: ParsedCountdownDate,
	now: Date,
	nowCalendarDate: CalendarDate
): boolean => {
	if (value.kind === 'date-only') {
		return compareCalendarDates(nowCalendarDate, value.calendarDate) < 0;
	}
	return now.getTime() < value.date.getTime();
};

const isAfterWindowEnd = (
	value: ParsedCountdownDate,
	now: Date,
	nowCalendarDate: CalendarDate
): boolean => {
	if (value.kind === 'date-only') {
		return compareCalendarDates(nowCalendarDate, value.calendarDate) > 0;
	}
	return now.getTime() > value.date.getTime();
};

const getExpiredLabel = (
	target: ParsedCountdownDate,
	nowCalendarDate: CalendarDate,
	timeZone?: string
): string =>
	compareCalendarDates(getParsedTargetCalendarDate(target, timeZone), nowCalendarDate) === 0
		? 'today'
		: 'ended';

export const parseCountdownDate = (value: string): ParsedCountdownDate | null => {
	const calendarDate = parseCalendarDate(value);
	if (calendarDate) {
		return {
			kind: 'date-only',
			calendarDate,
			sortKey: calendarDateToDayNumber(calendarDate) * DAY_MS
		};
	}

	const date = toDate(value);
	if (!date) return null;
	return {
		kind: 'date-time',
		date,
		sortKey: date.getTime()
	};
};

export const formatCountdownRemaining = (
	item: CountdownItem,
	options: CountdownResolutionOptions = {}
): string | null => {
	const target = parseCountdownDate(item.targetDate);
	if (!target) return null;

	const now = options.now ?? new Date();
	const timeZone = parseDisplayTimeZone(options.dateTimeDisplay);
	const nowCalendarDate = getCalendarDateForInstant(now, timeZone);

	if (target.kind === 'date-only') {
		const diffDays =
			calendarDateToDayNumber(target.calendarDate) - calendarDateToDayNumber(nowCalendarDate);
		if (diffDays < 0) {
			return item.showWhenExpired ? getExpiredLabel(target, nowCalendarDate, timeZone) : null;
		}
		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'tomorrow';
		if (diffDays < 14) return `in ${pluralize(diffDays, 'day')}`;
		if (diffDays < 60) return formatWeeksAndDays(diffDays);
		return formatCalendarMonthsAndDays(nowCalendarDate, target.calendarDate);
	}

	const diffMs = target.date.getTime() - now.getTime();
	if (diffMs <= 0) {
		return item.showWhenExpired ? getExpiredLabel(target, nowCalendarDate, timeZone) : null;
	}
	if (diffMs < HOUR_MS)
		return `in ${pluralize(Math.max(1, Math.ceil(diffMs / MINUTE_MS)), 'minute')}`;
	if (diffMs < 2 * DAY_MS) {
		return diffMs < 6 * HOUR_MS
			? formatHoursAndMinutes(diffMs)
			: `in ${pluralize(Math.floor(diffMs / HOUR_MS), 'hour')}`;
	}
	if (diffMs < 14 * DAY_MS) return formatDaysAndHours(diffMs);
	const targetCalendarDate = getCalendarDateForInstant(target.date, timeZone);
	const diffDays =
		calendarDateToDayNumber(targetCalendarDate) - calendarDateToDayNumber(nowCalendarDate);
	if (diffDays < 60) return formatWeeksAndDays(diffDays);
	return formatCalendarMonthsAndDays(nowCalendarDate, targetCalendarDate);
};

export const resolveCountdownItems = (
	items: CountdownItem[] | null | undefined,
	options: CountdownResolutionOptions = {}
): ResolvedCountdownItem[] => {
	const now = options.now ?? new Date();
	const timeZone = parseDisplayTimeZone(options.dateTimeDisplay);
	const nowCalendarDate = getCalendarDateForInstant(now, timeZone);
	const maxVisible = options.maxVisible ?? MAX_VISIBLE_COUNTDOWNS;

	const resolved = (items ?? [])
		.flatMap((item) => {
			if (!item.id || !item.label || !item.targetDate || item.enabled === false) return [];

			const target = parseCountdownDate(item.targetDate);
			if (!target) return [];

			const startsAt = item.startsAt ? parseCountdownDate(item.startsAt) : null;
			if (item.startsAt && !startsAt) return [];
			if (startsAt && isBeforeWindowStart(startsAt, now, nowCalendarDate)) return [];

			const endsAt = item.endsAt ? parseCountdownDate(item.endsAt) : null;
			if (item.endsAt && !endsAt) return [];
			if (endsAt && isAfterWindowEnd(endsAt, now, nowCalendarDate)) return [];

			const remainingText = formatCountdownRemaining(item, {
				now,
				dateTimeDisplay: options.dateTimeDisplay
			});
			if (!remainingText) return [];

			return [
				{
					id: item.id,
					label: item.label,
					remainingText,
					targetDate: item.targetDate,
					variant: item.variant ?? 'default',
					isDateOnly: target.kind === 'date-only',
					sortOrder: item.sortOrder ?? Number.MAX_SAFE_INTEGER,
					targetSortKey: target.sortKey
				}
			];
		})
		.sort((left, right) => {
			if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
			if (left.targetSortKey !== right.targetSortKey)
				return left.targetSortKey - right.targetSortKey;
			const labelCompare = left.label.localeCompare(right.label, undefined, {
				sensitivity: 'base'
			});
			if (labelCompare !== 0) return labelCompare;
			return left.id.localeCompare(right.id, undefined, { sensitivity: 'base' });
		})
		.slice(0, maxVisible);

	return resolved.map(({ sortOrder: _sortOrder, targetSortKey: _targetSortKey, ...item }) => item);
};

export const toCountdownDateTimeAttr = (item: ResolvedCountdownItem): string =>
	item.isDateOnly ? item.targetDate : (toDate(item.targetDate)?.toISOString() ?? item.targetDate);
