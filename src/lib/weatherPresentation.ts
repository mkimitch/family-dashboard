import {
	legacyConditionText,
	weatherConditionIconSlug,
	weatherLottiePath,
	type WeatherCondition
} from './weatherIcons';

export type WeatherContext = 'current' | 'hourly' | 'fullDay' | 'daytime' | 'nighttime';
type Light = 'day' | 'night';

export type ConditionRecord = {
	condition?: WeatherCondition | null;
	conditions?: Partial<Record<WeatherContext, unknown>>;
	_sources?: { condition?: unknown };
	_src?: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const isLight = (value: unknown): value is Light => value === 'day' || value === 'night';
const severe = (intensity: unknown) =>
	intensity === 'heavy' || intensity === 'very_heavy' || intensity === 'extreme';

const ART_FAMILIES = {
	drizzle: 'drizzle',
	rain: 'rain',
	snow: 'snow',
	sleet: 'sleet',
	freezing_drizzle: 'sleet',
	freezing_rain: 'sleet',
	ice_pellets: 'sleet',
	mixed_precipitation: 'sleet',
	hail: 'hail',
	fog: 'fog',
	haze: 'haze',
	smoke: 'smoke',
	volcanic_ash: 'smoke',
	mist: 'mist',
	sand: 'dust',
	dust: 'dust',
	squall: 'wind-alert',
	tornado: 'tornado'
} as const;

const VARIANT_FAMILIES = new Set([
	'drizzle',
	'rain',
	'snow',
	'sleet',
	'hail',
	'fog',
	'haze',
	'smoke'
]);
const LIGHT_FAMILIES = new Set(['fog', 'haze', 'dust']);
const PRIORITY = [
	'tornado',
	'thunderstorm',
	'hail',
	'mixed_precipitation',
	'freezing_rain',
	'freezing_drizzle',
	'ice_pellets',
	'sleet',
	'snow',
	'rain',
	'drizzle',
	'squall',
	'volcanic_ash',
	'fog',
	'smoke',
	'mist',
	'haze',
	'dust',
	'sand'
];

function skySlug(sky: unknown[], light: Light | undefined): string | undefined {
	if (sky.length > 1) return 'cloudy';
	switch (sky[0]) {
		case 'clear':
			return `clear-${light ?? 'day'}`;
		case 'mostly_clear':
		case 'partly_cloudy':
			return `partly-cloudy-${light ?? 'day'}`;
		case 'mostly_cloudy':
		case 'cloudy':
			return 'cloudy';
		case 'overcast':
			return light ? `overcast-${light}` : 'overcast';
	}
}

function variantSlug(family: string, sky: unknown[], light: Light | undefined, heavy: boolean) {
	const prefix = light ? `-${light}` : '';
	if (VARIANT_FAMILIES.has(family)) {
		if (heavy) return `extreme${prefix}-${family}`;
		if (sky.length === 1) {
			if (sky[0] === 'overcast' || sky[0] === 'mostly_cloudy') {
				return `overcast${prefix}-${family}`;
			}
			if (light && (sky[0] === 'partly_cloudy' || sky[0] === 'mostly_clear')) {
				return `partly-cloudy-${light}-${family}`;
			}
		}
	}
	return light && LIGHT_FAMILIES.has(family) ? `${family}-${light}` : family;
}

function cloudArtClasses(cloud: Record<string, unknown>): unknown[] {
	if (cloud.mixed === true) return [];
	if (Array.isArray(cloud.classes) && cloud.classes.length) return cloud.classes;
	const percent = cloud.percent;
	if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100)
		return [];
	// Artwork bands for a provider-reported measurement. The contract values stay intact.
	if (percent <= 10) return ['clear'];
	if (percent <= 30) return ['mostly_clear'];
	if (percent <= 65) return ['partly_cloudy'];
	return [percent >= 90 ? 'overcast' : 'mostly_cloudy'];
}

function canonicalPresentation(
	entry: Record<string, unknown>,
	context: WeatherContext,
	solar?: Light
) {
	const description =
		typeof entry.description === 'string' && entry.description.trim()
			? entry.description
			: 'Weather condition unavailable';
	const cloud = asRecord(entry.cloudCover);
	const phenomena = Array.isArray(entry.phenomena) ? entry.phenomena.map(asRecord) : [];
	const classes = cloudArtClasses(cloud);
	let slug: string | undefined;
	let approximation: string | null = null;

	if (entry.context === context && (entry.status === 'known' || entry.status === 'partial')) {
		const light =
			context === 'daytime'
				? 'day'
				: context === 'nighttime'
					? 'night'
					: context === 'fullDay'
						? undefined
						: (solar ?? (isLight(entry.lightHint) ? entry.lightHint : undefined));
		const kinds = new Set(phenomena.map((event) => event.kind));
		const kind = PRIORITY.find((event) => kinds.has(event));
		const heavy = (eventKind: string) =>
			phenomena.some((event) => event.kind === eventKind && severe(event.intensity));

		if (kind === 'thunderstorm') {
			const precip = kinds.has('snow')
				? 'snow'
				: kinds.has('rain') || kinds.has('drizzle')
					? 'rain'
					: '';
			const cover =
				heavy(kind) || heavy('rain') || heavy('snow') || heavy('drizzle')
					? 'extreme'
					: classes.length === 1 && (classes[0] === 'mostly_cloudy' || classes[0] === 'overcast')
						? 'overcast'
						: '';
			slug = ['thunderstorms', light, cover, precip].filter(Boolean).join('-');
			const shown = new Set(['thunderstorm', precip]);
			if ([...kinds].some((event) => !shown.has(event as string))) {
				approximation = 'Thunderstorm artwork simplifies the accompanying conditions.';
			}
		} else if (kind) {
			const mixed = kind === 'snow' && (kinds.has('rain') || kinds.has('drizzle'));
			const artKind = mixed ? 'mixed_precipitation' : (kind as keyof typeof ART_FAMILIES);
			const family = ART_FAMILIES[artKind];
			slug = variantSlug(family, classes, light, heavy(kind) || (mixed && heavy('rain')));
			if (family !== kind && kind !== 'squall') {
				const label = mixed ? 'mixed rain and snow' : kind.replaceAll('_', ' ');
				approximation = `Uses ${family} artwork for ${label}.`;
			}
			if (kinds.size > 1 && !mixed && !approximation) {
				approximation = 'The animation shows one of the reported phenomena.';
			}
		} else {
			slug = skySlug(classes, light);
			if (classes.length > 1)
				approximation = 'Representative cloud artwork for mixed sky coverage.';
			if (!slug && cloud.mixed === true) {
				slug = 'cloudy';
				approximation =
					Array.isArray(cloud.classes) && cloud.classes.length > 1
						? 'Representative cloud artwork for mixed sky coverage.'
						: 'The source does not identify all the individual cloud classes.';
			}
		}
		if (context === 'fullDay' && slug?.endsWith('-day') && !approximation) {
			approximation = 'This sky family has no period-neutral artwork.';
		}
	}
	return {
		path: weatherLottiePath(slug ?? 'not-available'),
		description,
		approximation: approximation ?? (slug ? null : 'No verified condition artwork was selected.')
	};
}

export function presentWeatherCondition(
	row: ConditionRecord | null | undefined,
	version: unknown,
	context: WeatherContext,
	solar?: Light
) {
	if (version === 1)
		return canonicalPresentation(asRecord(row?.conditions?.[context]), context, solar);
	const legacy = row?.condition;
	return {
		path: weatherLottiePath(
			weatherConditionIconSlug(legacy, row?._sources?.condition ?? row?._src, solar)
		),
		description: legacyConditionText(legacy),
		approximation: null
	};
}
