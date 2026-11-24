import { decorationIds, type CalendarDecoration } from '../calendarDecorations';

const densityOptions = ['adaptive', 'full', 'reduced'] as const;
export type Density = (typeof densityOptions)[number];
const peckStyles = ['single', 'double', 'random'] as const;
export type GroundPeckStyle = (typeof peckStyles)[number];
export type PeckVariant = Exclude<GroundPeckStyle, 'random'>;
type Interval = readonly [number, number];

const motion = (label: string, intervalMs: Interval, durationMs: number) => ({
	label,
	defaults: { enabled: true, intervalMs, durationMs }
});

export const settingsDefinitions = {
	density: {
		label: 'Decoration density',
		category: 'Calendar appearance',
		scopes: ['global', 'decoration'],
		options: densityOptions,
		default: 'adaptive' as Density
	},
	groundPeckStyle: {
		label: 'Ground peck style',
		category: 'Turkey animations',
		scopes: ['global', 'thanksgiving'],
		options: peckStyles,
		default: 'random' as GroundPeckStyle
	},
	motions: {
		category: 'Turkey animations',
		scopes: ['global', 'thanksgiving'],
		fields: {
			enabled: { label: 'Enabled', type: 'boolean' },
			intervalMs: { label: 'Interval (ms)', type: 'range', min: 1000, max: 86400000 },
			durationMs: { label: 'Duration (ms)', type: 'integer', min: 100, max: 10000 }
		},
		items: {
			head: motion('Head tilt', [25000, 45000], 850),
			wattle: motion('Wattle wobble', [45000, 75000], 450),
			wing: motion('Wing ruffle', [50000, 85000], 700),
			peck: motion('Ground peck', [65000, 105000], 1050),
			tail: motion('Tail ruffle', [30000, 40000], 1700)
		}
	}
} as const;

export type Motion = keyof typeof settingsDefinitions.motions.items;
export type MotionSettings = ReturnType<typeof motion>['defaults'];
export type TurkeySettings = Record<Motion, MotionSettings>;
export const motions = Object.keys(settingsDefinitions.motions.items) as Motion[];
type Overrides = {
	groundPeckStyle?: GroundPeckStyle;
	density?: Density;
	motions?: Partial<Record<Motion, Partial<MotionSettings>>>;
};
export type InstallationSettings = {
	version: 1;
	global?: Overrides;
	decorations?: Partial<Record<CalendarDecoration, Overrides>>;
};

const record = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
const isDensity = (v: unknown): v is Density => densityOptions.some((option) => option === v);
const isPeckStyle = (v: unknown): v is GroundPeckStyle => peckStyles.some((option) => option === v);
const bounded = (v: unknown, bounds: { min: number; max: number }): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= bounds.min && v <= bounds.max;

// Emit only registered public fields. A bad field cannot erase valid siblings or inherited values.
const parseOverrides = (raw: unknown, allowMotions: boolean): Overrides => {
	const result: Overrides = {};
	if (!record(raw)) return result;
	if (isDensity(raw.density)) result.density = raw.density;
	if (allowMotions && isPeckStyle(raw.groundPeckStyle))
		result.groundPeckStyle = raw.groundPeckStyle;
	if (allowMotions && record(raw.motions)) {
		result.motions = {};
		const { fields } = settingsDefinitions.motions;
		for (const id of motions) {
			const input = raw.motions[id];
			if (!record(input)) continue;
			const values: Partial<MotionSettings> = {};
			if (typeof input.enabled === 'boolean') values.enabled = input.enabled;
			if (bounded(input.durationMs, fields.durationMs)) values.durationMs = input.durationMs;
			const range = input.intervalMs;
			if (
				Array.isArray(range) &&
				range.length === 2 &&
				bounded(range[0], fields.intervalMs) &&
				bounded(range[1], fields.intervalMs) &&
				range[0] <= range[1]
			) {
				values.intervalMs = [range[0], range[1]];
			}
			result.motions[id] = values;
		}
	}
	return result;
};

export const parseInstallationSettings = (raw: unknown): InstallationSettings => {
	if (!record(raw) || raw.version !== 1) throw new Error('Unsupported Daymark settings version');
	const decorations: InstallationSettings['decorations'] = {};
	if (record(raw.decorations)) {
		for (const id of decorationIds) {
			if (id in raw.decorations)
				decorations[id] = parseOverrides(raw.decorations[id], id === 'thanksgiving');
		}
	}
	return { version: 1, global: parseOverrides(raw.global, true), decorations };
};

export const resolveSettings = (
	installation: InstallationSettings | undefined,
	decoration: CalendarDecoration | null,
	params: URLSearchParams
) => {
	const global = installation?.global;
	const local = decoration ? installation?.decorations?.[decoration] : undefined;
	const preview = params.get('decorationDensity');
	const density = isDensity(preview)
		? preview
		: (local?.density ?? global?.density ?? settingsDefinitions.density.default);
	const peckPreview = params.get('groundPeckStyle');
	const groundPeckStyle = isPeckStyle(peckPreview)
		? peckPreview
		: (local?.groundPeckStyle ??
			global?.groundPeckStyle ??
			settingsDefinitions.groundPeckStyle.default);
	const turkey = {} as TurkeySettings;
	for (const id of motions) {
		turkey[id] = {
			...settingsDefinitions.motions.items[id].defaults,
			...global?.motions?.[id],
			...local?.motions?.[id]
		};
	}
	return { density, groundPeckStyle, turkey, motionAllowed: params.get('seasonMotion') !== 'off' };
};

export const simplifiedDecoration = (
	density: Density,
	crowded: boolean,
	decoration: CalendarDecoration | null
) => density === 'reduced' || (density === 'adaptive' && crowded && decoration !== 'halloween');
