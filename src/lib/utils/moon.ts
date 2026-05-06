export type MoonPhaseName =
	| 'New Moon'
	| 'Waxing Crescent'
	| 'First Quarter'
	| 'Waxing Gibbous'
	| 'Full Moon'
	| 'Waning Gibbous'
	| 'Last Quarter'
	| 'Waning Crescent';

export type MoonPhaseAbbreviation = 'New' | 'WaxC' | 'First' | 'WaxG' | 'Full' | 'WanG' | 'Last' | 'WanC';

export type MoonImageSize = 50 | 100;

export type GetMoonIconPathOptions = {
	moonPhase: number;
	basePath?: string;
	frameCount?: number;
	size?: MoonImageSize;
};

export const MOON_FRAME_COUNT = 233;

const SYNODIC_MONTH_DAYS = 29.530588853;
const SYNODIC_MONTH_MS = SYNODIC_MONTH_DAYS * 24 * 60 * 60 * 1000;
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

const PHASE_NAMES: MoonPhaseName[] = [
	'New Moon',
	'Waxing Crescent',
	'First Quarter',
	'Waxing Gibbous',
	'Full Moon',
	'Waning Gibbous',
	'Last Quarter',
	'Waning Crescent'
];

const MOON_PHASE_ABBREVIATIONS: MoonPhaseAbbreviation[] = [
	'New',
	'WaxC',
	'First',
	'WanG',
	'Full',
	'WanG',
	'Last',
	'WanC'
];

export const normalizeMoonPhase = (moonPhase: number): number => {
	if (!Number.isFinite(moonPhase)) return 0;
	if (moonPhase === 1) return 0;
	return ((moonPhase % 1) + 1) % 1;
};

export const getMoonIconPath = ({
	moonPhase,
	basePath,
	frameCount = MOON_FRAME_COUNT,
	size = 100
}: GetMoonIconPathOptions): string => {
	const resolvedBase = basePath ?? `/assets/moon/moon-${size}`;
	const phase = normalizeMoonPhase(moonPhase);
	const index = Math.round(phase * (frameCount - 1));
	const file = `moon-${String(index).padStart(4, '0')}.png`;
	return `${resolvedBase}/${file}`;
};

export const computeMoonPhase = (date: Date = new Date()): number => {
	const elapsed = (date.getTime() - KNOWN_NEW_MOON_MS) % SYNODIC_MONTH_MS;
	const positive = elapsed < 0 ? elapsed + SYNODIC_MONTH_MS : elapsed;
	return positive / SYNODIC_MONTH_MS;
};

export const getMoonPhaseName = (moonPhase: number): MoonPhaseName => {
	const phase = normalizeMoonPhase(moonPhase);
	const eighth = Math.round(phase * 8) % 8;
	return PHASE_NAMES[eighth] ?? 'New Moon';
};

export const getMoonPhaseAbbreviation = (moonPhase: number): MoonPhaseAbbreviation => {
	const phase = normalizeMoonPhase(moonPhase);
	const eighth = Math.round(phase * 8) % 8;
	return MOON_PHASE_ABBREVIATIONS[eighth] ?? 'New';
};

export const getMoonIlluminationPct = (moonPhase: number): number => {
	const phase = normalizeMoonPhase(moonPhase);
	return Math.round((1 - Math.cos(2 * Math.PI * phase)) * 50);
};
