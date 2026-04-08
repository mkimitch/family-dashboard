import { DATE_TIME_APP_DEFAULTS, type ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
import {
	formatClockParts,
	formatDate,
	formatDateTime,
	formatForecastWeekday,
	formatMenuDateLabel,
	formatTime,
	formatUpdatedAgo,
	formatUptime,
	type ClockParts,
	type DateTimeInput,
	type FormatDateOptions,
	type FormatDateTimeOptions,
	type FormatMenuDateLabelOptions,
	type FormatTimeOptions,
	type FormatUpdatedAgoOptions
} from '$lib/utils/dateTime';

export type DateTimeDisplaySettingsGetter = () => ResolvedDateTimeDisplaySettings;

const fallbackSettingsGetter: DateTimeDisplaySettingsGetter = () => DATE_TIME_APP_DEFAULTS;

export const getResolvedDateTimeDisplaySettings = (
	value:
		| { dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null }
		| null
		| undefined
): ResolvedDateTimeDisplaySettings => value?.dateTimeDisplay ?? DATE_TIME_APP_DEFAULTS;

export const createDateTimeFormatter = (
	getSettings: DateTimeDisplaySettingsGetter = fallbackSettingsGetter
): {
	getSettings: DateTimeDisplaySettingsGetter;
	formatDate: (value: DateTimeInput, options?: FormatDateOptions) => string;
	formatTime: (value: DateTimeInput, options?: FormatTimeOptions) => string;
	formatDateTime: (value: DateTimeInput, options?: FormatDateTimeOptions) => string;
	formatUpdatedAgo: (value: DateTimeInput, options?: FormatUpdatedAgoOptions) => string;
	formatUptime: (seconds: number | null | undefined) => string;
	formatMenuDateLabel: (value: string, options?: FormatMenuDateLabelOptions) => string;
	formatForecastWeekday: (value: DateTimeInput) => string;
	formatClockParts: (value: DateTimeInput) => ClockParts;
} => ({
	getSettings,
	formatDate: (value, options) => formatDate(value, getSettings(), options),
	formatTime: (value, options) => formatTime(value, getSettings(), options),
	formatDateTime: (value, options) => formatDateTime(value, getSettings(), options),
	formatUpdatedAgo: (value, options) => formatUpdatedAgo(value, getSettings(), options),
	formatUptime: (seconds) => formatUptime(seconds, getSettings()),
	formatMenuDateLabel: (value, options) => formatMenuDateLabel(value, getSettings(), options),
	formatForecastWeekday: (value) => formatForecastWeekday(value, getSettings()),
	formatClockParts: (value) => formatClockParts(value, getSettings())
});
