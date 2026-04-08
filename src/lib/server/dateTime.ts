import { env } from '$env/dynamic/private';
import {
	resolveDateTimeDisplaySettings,
	type DateTimeDisplaySettingsInput,
	type ResolvedDateTimeDisplaySettings
} from '$lib/config/dateTime';

type EnvLike = Record<string, string | undefined>;

const runtimeEnv = env as EnvLike;

const normalizeString = (value: string | undefined): string | undefined => {
	const next = value?.trim();
	return next ? next : undefined;
};

const parseBoolean = (value: string | undefined): boolean | undefined => {
	const next = value?.trim().toLowerCase();
	if (!next) return undefined;
	if (['1', 'true', 'yes', 'on'].includes(next)) return true;
	if (['0', 'false', 'no', 'off'].includes(next)) return false;
	return undefined;
};

const isValidLocale = (value: string): boolean => {
	try {
		return Intl.DateTimeFormat.supportedLocalesOf(value).length > 0;
	} catch {
		return false;
	}
};

const isValidTimeZone = (value: string): boolean => {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
		return true;
	} catch {
		return false;
	}
};

export const getEnvDateTimeDisplayOverrides = (
	envValues: EnvLike = runtimeEnv
): DateTimeDisplaySettingsInput | null => {
	const locale = normalizeString(envValues.DISPLAY_LOCALE);
	const timeZone = normalizeString(envValues.DISPLAY_TIMEZONE);
	const hour12 = parseBoolean(envValues.DISPLAY_HOUR12);

	const overrides: DateTimeDisplaySettingsInput = {};

	if (locale && isValidLocale(locale)) overrides.locale = locale;
	if (timeZone && isValidTimeZone(timeZone)) overrides.timeZone = timeZone;
	if (hour12 !== undefined) overrides.hour12 = hour12;

	return Object.keys(overrides).length > 0 ? overrides : null;
};

export const resolveRequestDateTimeDisplaySettings = (input?: {
	persisted?: DateTimeDisplaySettingsInput | null;
}): ResolvedDateTimeDisplaySettings =>
	resolveDateTimeDisplaySettings(getEnvDateTimeDisplayOverrides(), input?.persisted ?? null);
