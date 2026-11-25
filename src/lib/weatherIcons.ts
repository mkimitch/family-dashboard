export type WeatherCondition = {
	category?: string;
	code?: number | string;
	desc?: string;
	description?: string;
	icon?: string;
	id?: number | string;
	main?: string;
	weatherCode?: number | string;
};

type DayPeriod = 'day' | 'night';
type SkyCover = 'extreme' | 'overcast' | 'partly' | undefined;
type VariantCondition = 'drizzle' | 'fog' | 'hail' | 'haze' | 'rain' | 'sleet' | 'smoke' | 'snow';

const WEATHER_LOTTIE_ROOT = '/lottie/weather';

export const weatherLottiePath = (slug: string): string => `${WEATHER_LOTTIE_ROOT}/${slug}.json`;

const OPENWEATHER_IDS = new Set([
	200, 201, 202, 210, 211, 212, 221, 230, 231, 232, 300, 301, 302, 310, 311, 312, 313, 314, 321,
	500, 501, 502, 503, 504, 511, 520, 521, 522, 531, 600, 601, 602, 611, 612, 613, 615, 616, 620,
	621, 622, 701, 711, 721, 731, 741, 751, 761, 762, 771, 781, 800, 801, 802, 803, 804
]);
const TOMORROW_LEGACY_SKY = new Map([
	[1000, 'clear'],
	[1001, 'cloudy'],
	[1100, 'mostly clear'],
	[1101, 'partly cloudy'],
	[1102, 'mostly cloudy']
]);
const LEGACY_ICON = /^(?:01|02|03|04|09|10|11|13|50)[dn]$/i;
const LEGACY_DESCRIPTION =
	/^(?:(?:light|moderate|heavy|extreme|partly cloudy|overcast) )?(?:clear(?: sky)?|sunny|cloudy|clouds|fog|mist|haze|smoke|dust|freezing rain|freezing drizzle|ice pellets|hail|drizzle|rain|sleet|snow|flurries|rain and snow|thunderstorms?(?: and (?:rain|snow))?|tornado|hurricane)$/;

const conditionIdOf = (condition: WeatherCondition): number | undefined => {
	const raw = condition.id ?? condition.weatherCode ?? condition.code;
	return typeof raw === 'number' && Number.isInteger(raw)
		? raw
		: typeof raw === 'string' && /^\d+$/.test(raw)
			? Number(raw)
			: undefined;
};

const weatherIconCodeOf = (condition: WeatherCondition): string | undefined =>
	[condition.icon, condition.code]
		.find((value): value is string => typeof value === 'string' && LEGACY_ICON.test(value))
		?.toLowerCase();

const skyCoverOf = (icon: string | undefined, text: string): SkyCover => {
	if (/extreme|heavy|violent|ragged|severe|torrential/.test(text)) return 'extreme';
	if (/overcast/.test(text) || ['04', '09', '13'].includes(icon?.slice(0, 2) ?? ''))
		return 'overcast';
	if (/partly|scattered|few clouds?/.test(text) || ['02', '10'].includes(icon?.slice(0, 2) ?? ''))
		return 'partly';
	return undefined;
};

const variantSlug = (
	condition: VariantCondition,
	period: DayPeriod | undefined,
	cover: SkyCover
): string => {
	if (cover === 'extreme')
		return period ? `extreme-${period}-${condition}` : `extreme-${condition}`;
	if (cover === 'overcast')
		return period ? `overcast-${period}-${condition}` : `overcast-${condition}`;
	if (cover === 'partly' && period) return `partly-cloudy-${period}-${condition}`;
	return condition;
};

const visibilityVariantSlug = (
	condition: 'fog' | 'haze',
	period: DayPeriod | undefined,
	cover: SkyCover
): string => {
	if (cover) return variantSlug(condition, period, cover);
	return period ? `${condition}-${period}` : condition;
};

const thunderstormSlug = (
	period: DayPeriod | undefined,
	cover: SkyCover,
	precipitation?: 'rain' | 'snow'
): string => {
	const parts = ['thunderstorms'];
	if (period) parts.push(period);
	if (cover === 'extreme' || cover === 'overcast') parts.push(cover);
	if (precipitation) parts.push(precipitation);
	return parts.join('-');
};

const iconForConditionId = (
	id: number,
	period: DayPeriod | undefined,
	cover: SkyCover,
	text: string
): string | undefined => {
	if (id >= 200 && id <= 232) {
		const precipitation = /snow/.test(text)
			? 'snow'
			: id <= 202 || id >= 230 || /rain|drizzle/.test(text)
				? 'rain'
				: undefined;
		const severity: SkyCover = [202, 212, 221, 232].includes(id) ? 'extreme' : cover;
		return thunderstormSlug(period, severity, precipitation);
	}
	if (id >= 300 && id <= 321) {
		const severity: SkyCover = [302, 312, 314].includes(id)
			? 'extreme'
			: [300, 310].includes(id)
				? 'partly'
				: cover;
		return variantSlug('drizzle', period, severity ?? 'overcast');
	}
	if (id >= 500 && id <= 531) {
		if (id === 511) return variantSlug('sleet', period, cover ?? 'overcast');
		const severity: SkyCover = [502, 503, 504, 522, 531].includes(id) ? 'extreme' : cover;
		return variantSlug('rain', period, severity);
	}
	if (id >= 600 && id <= 622) {
		if (id >= 611 && id <= 616) {
			const severity: SkyCover = [612, 615].includes(id) ? 'partly' : cover;
			return variantSlug('sleet', period, severity ?? 'overcast');
		}
		const severity: SkyCover = [602, 622].includes(id)
			? 'extreme'
			: [600, 620].includes(id)
				? 'partly'
				: cover;
		return variantSlug('snow', period, severity ?? 'overcast');
	}
	if (id === 701) return 'mist';
	if (id === 711) return variantSlug('smoke', period, cover);
	if (id === 721) return visibilityVariantSlug('haze', period, cover);
	if (id === 731 || id === 751 || id === 761) return period ? `dust-${period}` : 'dust';
	if (id === 741) return visibilityVariantSlug('fog', period, cover);
	if (id === 762) return variantSlug('smoke', period, 'extreme');
	if (id === 771) return 'wind-alert';
	if (id === 781) return 'tornado';
	if (id === 800) return period === 'night' ? 'clear-night' : 'clear-day';
	if (id === 801) return period === 'night' ? 'partly-cloudy-night' : 'partly-cloudy-day';
	if (id === 802) return 'cloudy';
	if (id === 803 || id === 804) return period ? `overcast-${period}` : 'overcast';
	return undefined;
};

const iconForDescription = (
	text: string,
	period: DayPeriod | undefined,
	cover: SkyCover
): string | undefined => {
	if (/tornado|funnel cloud/.test(text)) return 'tornado';
	if (/hurricane|tropical cyclone|typhoon/.test(text)) return 'hurricane';
	if (/squall|gale|wind storm/.test(text)) return 'wind-alert';
	if (/thunder|lightning|storm/.test(text)) {
		const precipitation = /snow/.test(text)
			? 'snow'
			: /rain|drizzle/.test(text)
				? 'rain'
				: undefined;
		return thunderstormSlug(period, cover, precipitation);
	}
	if (/hail|ice pellets?/.test(text)) return variantSlug('hail', period, cover);
	if (/sleet|wintry mix|rain and snow|freezing rain/.test(text))
		return variantSlug('sleet', period, cover);
	if (/snow|flurr/.test(text)) return variantSlug('snow', period, cover);
	if (/drizzle|sprinkle/.test(text)) return variantSlug('drizzle', period, cover);
	if (/rain|shower/.test(text)) return variantSlug('rain', period, cover);
	if (/fog/.test(text)) return visibilityVariantSlug('fog', period, cover);
	if (/haze/.test(text)) return visibilityVariantSlug('haze', period, cover);
	if (/smoke|ash/.test(text)) return variantSlug('smoke', period, cover);
	if (/dust|sand/.test(text)) return period ? `dust-${period}` : 'dust';
	if (/mist/.test(text)) return 'mist';
	if (/overcast/.test(text)) return period ? `overcast-${period}` : 'overcast';
	if (/partly|scattered|few clouds?/.test(text))
		return period === 'night' ? 'partly-cloudy-night' : 'partly-cloudy-day';
	if (/cloud/.test(text)) {
		if (cover === 'overcast') return period ? `overcast-${period}` : 'overcast';
		if (cover === 'partly') return period === 'night' ? 'partly-cloudy-night' : 'partly-cloudy-day';
		return 'cloudy';
	}
	if (/clear|sunny|fair/.test(text)) return period === 'night' ? 'clear-night' : 'clear-day';
	return undefined;
};

const iconForWeatherIconCode = (
	icon: string,
	period: DayPeriod | undefined
): string | undefined => {
	if (icon.slice(0, 2) === '01') return period === 'night' ? 'clear-night' : 'clear-day';
	if (icon.slice(0, 2) === '02')
		return period === 'night' ? 'partly-cloudy-night' : 'partly-cloudy-day';
	if (icon.slice(0, 2) === '03') return 'cloudy';
	if (icon.slice(0, 2) === '04') return period ? `overcast-${period}` : 'overcast';
	if (icon.slice(0, 2) === '09') return variantSlug('rain', period, 'overcast');
	if (icon.slice(0, 2) === '10') return variantSlug('rain', period, 'partly');
	if (icon.slice(0, 2) === '11') return thunderstormSlug(period, undefined);
	if (icon.slice(0, 2) === '13') return variantSlug('snow', period, 'overcast');
	if (icon.slice(0, 2) === '50') return 'mist';
	return undefined;
};

export function legacyConditionText(condition: WeatherCondition | null | undefined): string {
	const text = [condition?.desc, condition?.description, condition?.main, condition?.category].find(
		(value): value is string => typeof value === 'string' && Boolean(value.trim())
	);
	if (text === 'ice_pellets') return 'Ice pellets';
	if (text === 'freezing_rain') return 'Freezing rain';
	return text ?? '';
}

export const weatherConditionIconSlug = (
	condition: WeatherCondition | null | undefined,
	provider?: unknown,
	lighting?: DayPeriod
): string => {
	if (!condition) return 'not-available';
	const id = conditionIdOf(condition);
	const icon = provider === 'tomorrow' ? undefined : weatherIconCodeOf(condition);
	const period = lighting ?? (icon?.endsWith('n') ? 'night' : icon ? 'day' : undefined);
	const text = legacyConditionText(condition).trim().toLowerCase();
	const cover = skyCoverOf(icon, text);
	const openweather =
		provider === 'openweather' ||
		(provider !== 'tomorrow' && (condition.id !== undefined || Boolean(icon)));
	if (openweather && id !== undefined && OPENWEATHER_IDS.has(id)) {
		return iconForConditionId(id, period, cover, '') ?? 'not-available';
	}
	if (openweather && id !== undefined && !OPENWEATHER_IDS.has(id)) return 'not-available';

	const sky = provider === 'tomorrow' && id !== undefined ? TOMORROW_LEGACY_SKY.get(id) : undefined;
	if (sky === 'mostly clear' || sky === 'partly cloudy') {
		return period === 'night' ? 'partly-cloudy-night' : 'partly-cloudy-day';
	}
	if (sky === 'mostly cloudy' || sky === 'cloudy') return 'cloudy';
	if (sky === 'clear') return period === 'night' ? 'clear-night' : 'clear-day';
	if (/^(?:(?:light|moderate|heavy|extreme) )?(?:freezing drizzle|ice pellets)$/.test(text)) {
		return variantSlug('sleet', period, cover);
	}
	const mapped = LEGACY_DESCRIPTION.test(text)
		? iconForDescription(text, period, cover)
		: undefined;
	return mapped ?? (icon ? iconForWeatherIconCode(icon, period) : undefined) ?? 'not-available';
};

export const weatherConditionIconPath = (condition: WeatherCondition | null | undefined): string =>
	weatherLottiePath(weatherConditionIconSlug(condition));

export const uvIconPath = (uv: number | undefined): string => {
	if (typeof uv !== 'number' || !Number.isFinite(uv) || uv < 1)
		return weatherLottiePath('uv-index');
	const level = Math.min(11, Math.max(1, Math.round(uv)));
	return weatherLottiePath(`uv-index-${level}`);
};

const BEAUFORT_UPPER_BOUNDS_MPH = [1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73];

export const beaufortLevelOf = (windMph: number): number => {
	if (!Number.isFinite(windMph) || windMph <= 0) return 0;
	const level = BEAUFORT_UPPER_BOUNDS_MPH.findIndex((upperBound) => windMph < upperBound);
	return level === -1 ? 12 : level;
};

export const windIconPath = (windMph: number | undefined): string =>
	typeof windMph === 'number'
		? weatherLottiePath(`wind-beaufort-${beaufortLevelOf(windMph)}`)
		: weatherLottiePath('wind');

export const pressureIconPath = (pressureHpa: number | undefined): string => {
	if (typeof pressureHpa !== 'number' || !Number.isFinite(pressureHpa))
		return weatherLottiePath('barometer');
	if (pressureHpa <= 1005) return weatherLottiePath('pressure-low');
	if (pressureHpa >= 1022) return weatherLottiePath('pressure-high');
	return weatherLottiePath('barometer');
};

export const alertIconPath = (severity: string, title = ''): string => {
	const text = title.toLowerCase();
	if (/avalanche/.test(text)) return weatherLottiePath('alert-avalanche-danger');
	if (/falling rocks?|rockfall/.test(text)) return weatherLottiePath('alert-falling-rocks');
	if (/tornado|funnel cloud/.test(text)) return weatherLottiePath('tornado');
	if (/hurricane|typhoon|tropical cyclone/.test(text))
		return weatherLottiePath('flag-hurricane-warning');
	if (/small craft/.test(text)) return weatherLottiePath('flag-small-craft-advisory');
	if (/gale/.test(text)) return weatherLottiePath('flag-gale-warning');
	if (/storm warning/.test(text)) return weatherLottiePath('flag-storm-warning');
	if (/wind|squall/.test(text)) return weatherLottiePath('wind-alert');
	const level = severity.toLowerCase();
	if (level === 'warning') return weatherLottiePath('code-red');
	if (level === 'watch') return weatherLottiePath('code-orange');
	if (level === 'advisory') return weatherLottiePath('code-yellow');
	return weatherLottiePath('code-green');
};
