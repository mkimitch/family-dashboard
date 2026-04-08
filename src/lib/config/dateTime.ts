export type DatePresetKey =
	| 'clockDate'
	| 'calendarWeekday'
	| 'calendarDayNumber'
	| 'menuDate'
	| 'forecastWeekday'
	| 'statusDate';

export type TimePresetKey = 'clockTime' | 'eventTime' | 'astroTime' | 'statusTime';

export type DateTimePresetKey = 'defaultDateTime';

export type RelativeDisplaySettings = {
	justNowSeconds: number;
	maxUnit: 'minute' | 'hour' | 'day';
};

export type UptimeDisplayUnit = 'day' | 'hour' | 'minute';

export type UptimeDisplaySettings = {
	maxUnits: 1 | 2 | 3;
	minUnit: UptimeDisplayUnit;
	compact: boolean;
};

export type DateTimeDisplaySettingsInput = {
	locale?: string;
	timeZone?: string;
	hour12?: boolean;
	presets?: {
		date?: Partial<Record<DatePresetKey, Intl.DateTimeFormatOptions>>;
		time?: Partial<Record<TimePresetKey, Intl.DateTimeFormatOptions>>;
		dateTime?: Partial<Record<DateTimePresetKey, Intl.DateTimeFormatOptions>>;
	};
	relative?: {
		updatedAgo?: Partial<RelativeDisplaySettings>;
		uptime?: Partial<UptimeDisplaySettings>;
	};
};

export type ResolvedDateTimeDisplaySettings = {
	locale: string;
	timeZone: string;
	hour12: boolean;
	presets: {
		date: Record<DatePresetKey, Intl.DateTimeFormatOptions>;
		time: Record<TimePresetKey, Intl.DateTimeFormatOptions>;
		dateTime: Record<DateTimePresetKey, Intl.DateTimeFormatOptions>;
	};
	relative: {
		updatedAgo: RelativeDisplaySettings;
		uptime: UptimeDisplaySettings;
	};
};

const DATE_PRESET_DEFAULTS = {
	clockDate: {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	},
	calendarWeekday: {
		weekday: 'short'
	},
	calendarDayNumber: {
		day: 'numeric'
	},
	menuDate: {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	},
	forecastWeekday: {
		weekday: 'short'
	},
	statusDate: {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}
} satisfies Record<DatePresetKey, Intl.DateTimeFormatOptions>;

const TIME_PRESET_DEFAULTS = {
	clockTime: {
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit'
	},
	eventTime: {
		hour: 'numeric',
		minute: '2-digit'
	},
	astroTime: {
		hour: 'numeric',
		minute: '2-digit'
	},
	statusTime: {
		hour: 'numeric',
		minute: '2-digit'
	}
} satisfies Record<TimePresetKey, Intl.DateTimeFormatOptions>;

const DATE_TIME_PRESET_DEFAULTS = {
	defaultDateTime: {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}
} satisfies Record<DateTimePresetKey, Intl.DateTimeFormatOptions>;

export const DATE_TIME_APP_DEFAULTS: ResolvedDateTimeDisplaySettings = {
	locale: 'en-US',
	timeZone: 'America/Chicago',
	hour12: true,
	presets: {
		date: DATE_PRESET_DEFAULTS,
		time: TIME_PRESET_DEFAULTS,
		dateTime: DATE_TIME_PRESET_DEFAULTS
	},
	relative: {
		updatedAgo: {
			justNowSeconds: 60,
			maxUnit: 'day'
		},
		uptime: {
			maxUnits: 2,
			minUnit: 'minute',
			compact: true
		}
	}
};

const mergePresetGroup = <T extends string>(
	base: Record<T, Intl.DateTimeFormatOptions>,
	overrides?: Partial<Record<T, Intl.DateTimeFormatOptions>>
): Record<T, Intl.DateTimeFormatOptions> => {
	const next = { ...base } as Record<T, Intl.DateTimeFormatOptions>;
	if (!overrides) return next;

	for (const key of Object.keys(overrides) as T[]) {
		const override = overrides[key];
		if (!override) continue;
		next[key] = { ...next[key], ...override };
	}

	return next;
};

export const mergeDateTimeDisplaySettings = (
	base: ResolvedDateTimeDisplaySettings,
	overrides?: DateTimeDisplaySettingsInput | null
): ResolvedDateTimeDisplaySettings => {
	if (!overrides) {
		return {
			...base,
			presets: {
				date: { ...base.presets.date },
				time: { ...base.presets.time },
				dateTime: { ...base.presets.dateTime }
			},
			relative: {
				updatedAgo: { ...base.relative.updatedAgo },
				uptime: { ...base.relative.uptime }
			}
		};
	}

	return {
		locale: overrides.locale ?? base.locale,
		timeZone: overrides.timeZone ?? base.timeZone,
		hour12: overrides.hour12 ?? base.hour12,
		presets: {
			date: mergePresetGroup(base.presets.date, overrides.presets?.date),
			time: mergePresetGroup(base.presets.time, overrides.presets?.time),
			dateTime: mergePresetGroup(base.presets.dateTime, overrides.presets?.dateTime)
		},
		relative: {
			updatedAgo: {
				...base.relative.updatedAgo,
				...overrides.relative?.updatedAgo
			},
			uptime: {
				...base.relative.uptime,
				...overrides.relative?.uptime
			}
		}
	};
};

export const resolveDateTimeDisplaySettings = (
	...layers: Array<DateTimeDisplaySettingsInput | null | undefined>
): ResolvedDateTimeDisplaySettings =>
	layers.reduce<ResolvedDateTimeDisplaySettings>(
		(settings, layer) => mergeDateTimeDisplaySettings(settings, layer),
		mergeDateTimeDisplaySettings(DATE_TIME_APP_DEFAULTS)
	);
