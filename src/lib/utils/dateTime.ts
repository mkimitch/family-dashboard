import {
	DATE_TIME_APP_DEFAULTS,
	type DatePresetKey,
	type DateTimePresetKey,
	type ResolvedDateTimeDisplaySettings,
	type TimePresetKey,
	type UptimeDisplayUnit
} from '$lib/config/dateTime';

export type DateTimeInput = string | number | Date | null | undefined;

export type FormatterOverrides = {
	locale?: string;
	timeZone?: string | null;
	hour12?: boolean;
	options?: Intl.DateTimeFormatOptions;
};

export type FormatDateOptions = FormatterOverrides & {
	preset?: DatePresetKey;
};

export type FormatTimeOptions = FormatterOverrides & {
	preset?: TimePresetKey;
};

export type FormatDateTimeOptions = FormatterOverrides & {
	preset?: DateTimePresetKey;
};

export type FormatUpdatedAgoOptions = {
	now?: Date;
};

export type FormatMenuDateLabelOptions = {
	now?: Date;
};

export type ClockParts = {
	weekday: string;
	month: string;
	day: string;
	year: string;
	hour: string;
	minute: string;
	second: string;
	dayPeriod: string;
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();
const UPTIME_UNIT_SECONDS: Record<UptimeDisplayUnit, number> = {
	day: 86400,
	hour: 3600,
	minute: 60
};
const UPTIME_UNITS: Array<{
	unit: UptimeDisplayUnit;
	shortLabel: string;
	longLabel: string;
}> = [
		{ unit: 'day', shortLabel: 'd', longLabel: 'day' },
		{ unit: 'hour', shortLabel: 'h', longLabel: 'hour' },
		{ unit: 'minute', shortLabel: 'm', longLabel: 'minute' }
	];
// Passing `timeZone: null` intentionally preserves source/local-day semantics for labels
// derived from date-only values, rather than rebucketing them through the display timezone.
const LOCAL_DAY_FORMAT_OVERRIDES = { timeZone: null } as const;

const defaultSettings = DATE_TIME_APP_DEFAULTS;

const partValue = (parts: Intl.DateTimeFormatPart[], type: string): string =>
	parts.find((part) => part.type === type)?.value ?? '';

const stableOptionsKey = (options: Intl.DateTimeFormatOptions): string =>
	Object.entries(options)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}:${String(value)}`)
		.join('|');

const getFormatter = (locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
	const key = `${locale}__${stableOptionsKey(options)}`;
	const cached = formatterCache.get(key);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat(locale, options);
	formatterCache.set(key, formatter);
	return formatter;
};

export const toDate = (value: DateTimeInput): Date | null => {
	if (value == null || value === '') return null;
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === 'string') {
		const match = value.match(DATE_ONLY_RE);
		if (match) {
			return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
		}
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const resolveSettings = (
	settings?: ResolvedDateTimeDisplaySettings
): ResolvedDateTimeDisplaySettings => settings ?? defaultSettings;

const resolveIntlOptions = (
	settings: ResolvedDateTimeDisplaySettings,
	baseOptions: Intl.DateTimeFormatOptions,
	overrides?: FormatterOverrides
): { locale: string; options: Intl.DateTimeFormatOptions } => {
	const locale = overrides?.locale ?? settings.locale;
	const hour12 = overrides?.hour12 ?? settings.hour12;
	// `null` is an explicit escape hatch for helpers that need local-day behavior.
	const timeZone = overrides?.timeZone === undefined ? settings.timeZone : overrides.timeZone ?? undefined;
	const next: Intl.DateTimeFormatOptions = {
		...baseOptions,
		...overrides?.options,
		hour12
	};
	if (timeZone) next.timeZone = timeZone;
	else delete next.timeZone;
	return { locale, options: next };
};

export const formatDate = (
	value: DateTimeInput,
	settings?: ResolvedDateTimeDisplaySettings,
	options?: FormatDateOptions
): string => {
	const date = toDate(value);
	if (!date) return '';
	const resolved = resolveSettings(settings);
	const preset = options?.preset ?? 'statusDate';
	const { locale, options: intlOptions } = resolveIntlOptions(
		resolved,
		resolved.presets.date[preset],
		options
	);
	const formatter = getFormatter(locale, intlOptions);
	return formatter.format(date);
};

export const formatTime = (
	value: DateTimeInput,
	settings?: ResolvedDateTimeDisplaySettings,
	options?: FormatTimeOptions
): string => {
	const date = toDate(value);
	if (!date) return '';
	const resolved = resolveSettings(settings);
	const preset = options?.preset ?? 'statusTime';
	const { locale, options: intlOptions } = resolveIntlOptions(
		resolved,
		resolved.presets.time[preset],
		options
	);
	const formatter = getFormatter(locale, intlOptions);
	return formatter.format(date);
};

export const formatDateTime = (
	value: DateTimeInput,
	settings?: ResolvedDateTimeDisplaySettings,
	options?: FormatDateTimeOptions
): string => {
	const date = toDate(value);
	if (!date) return '';
	const resolved = resolveSettings(settings);
	const preset = options?.preset ?? 'defaultDateTime';
	const { locale, options: intlOptions } = resolveIntlOptions(
		resolved,
		resolved.presets.dateTime[preset],
		options
	);
	const formatter = getFormatter(locale, intlOptions);
	return formatter.format(date);
};

export const formatUpdatedAgo = (
	value: DateTimeInput,
	settings?: ResolvedDateTimeDisplaySettings,
	options?: FormatUpdatedAgoOptions
): string => {
	const date = toDate(value);
	if (!date) return '';
	const resolved = resolveSettings(settings);
	const now = options?.now ?? new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.round(diffMs / 1000);
	const { justNowSeconds, maxUnit } = resolved.relative.updatedAgo;

	if (diffSec < 0) return 'just now';
	if (diffSec < justNowSeconds) return 'just now';

	const diffMin = Math.round(diffSec / 60);
	if (diffMin < 60 || maxUnit === 'minute') {
		return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
	}

	const diffHr = Math.round(diffMin / 60);
	if (diffHr < 24 || maxUnit === 'hour') {
		return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
	}

	const diffDay = Math.round(diffHr / 24);
	return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
};

export const formatUptime = (
	seconds: number | null | undefined,
	settings?: ResolvedDateTimeDisplaySettings
): string => {
	if (seconds == null || !Number.isFinite(seconds)) return '';
	const resolved = resolveSettings(settings);
	const { compact, maxUnits, minUnit } = resolved.relative.uptime;
	const totalSeconds = Math.floor(seconds);
	const smallestUnitSeconds = UPTIME_UNIT_SECONDS[minUnit];
	let remaining = Math.floor(totalSeconds / smallestUnitSeconds) * smallestUnitSeconds;
	const parts: string[] = [];
	let renderedHigherUnit = false;

	for (const unitConfig of UPTIME_UNITS) {
		if (UPTIME_UNIT_SECONDS[unitConfig.unit] < smallestUnitSeconds) continue;
		const value = Math.floor(remaining / UPTIME_UNIT_SECONDS[unitConfig.unit]);
		if (value <= 0 && !renderedHigherUnit) continue;
		parts.push(
			compact
				? `${value}${unitConfig.shortLabel}`
				: `${value} ${unitConfig.longLabel}${value === 1 ? '' : 's'}`
		);
		remaining -= value * UPTIME_UNIT_SECONDS[unitConfig.unit];
		renderedHigherUnit = true;
		if (parts.length >= maxUnits) break;
	}

	if (parts.length > 0) return parts.join(' ');
	return compact ? `0${minUnit.charAt(0)}` : `0 ${minUnit}s`;
};

export const formatMenuDateLabel = (
	value: string,
	settings?: ResolvedDateTimeDisplaySettings,
	options?: FormatMenuDateLabelOptions
): string => {
	const date = toDate(value);
	if (!date) return '';
	const now = options?.now ?? new Date();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	if (date.toDateString() === now.toDateString()) return 'Today';
	if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
	return formatDate(date, settings, { preset: 'menuDate', ...LOCAL_DAY_FORMAT_OVERRIDES });
};

export const formatForecastWeekday = (
	value: DateTimeInput,
	settings?: ResolvedDateTimeDisplaySettings
): string => formatDate(value, settings, { preset: 'forecastWeekday', ...LOCAL_DAY_FORMAT_OVERRIDES });

export const formatClockParts = (
	value: DateTimeInput,
	settings?: ResolvedDateTimeDisplaySettings
): ClockParts => {
	const date = toDate(value) ?? new Date();
	const resolved = resolveSettings(settings);
	const dateConfig = resolveIntlOptions(resolved, resolved.presets.date.clockDate);
	const timeConfig = resolveIntlOptions(resolved, resolved.presets.time.clockTime);
	const dateParts = getFormatter(dateConfig.locale, dateConfig.options).formatToParts(date);
	const timeParts = getFormatter(timeConfig.locale, timeConfig.options).formatToParts(date);

	return {
		weekday: partValue(dateParts, 'weekday'),
		month: partValue(dateParts, 'month'),
		day: partValue(dateParts, 'day'),
		year: partValue(dateParts, 'year'),
		hour: partValue(timeParts, 'hour'),
		minute: partValue(timeParts, 'minute'),
		second: partValue(timeParts, 'second'),
		dayPeriod: partValue(timeParts, 'dayPeriod')
	};
};
