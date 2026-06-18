import type { CountdownVariant } from '$lib/config/countdowns';
import { COUNTDOWN_VARIANTS } from '$lib/server/db/schema';
import { isValidTimeZone } from '$lib/server/dateTime';

export type CountdownCreateInput = {
	id?: string;
	label: string;
	description?: string | null;
	targetDate: string;
	targetTime?: string | null;
	timeZone?: string | null;
	isAllDay?: boolean;
	isEnabled?: boolean;
	showWhenExpired?: boolean;
	startsAt?: string | null;
	endsAt?: string | null;
	sortOrder?: number | null;
	priority?: number;
	variant?: CountdownVariant;
};

export type CountdownUpdateInput = Partial<Omit<CountdownCreateInput, 'id'>>;
export type CountdownReorderInput = { ids: string[] };

type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

const CREATE_FIELDS = new Set([
	'id',
	'label',
	'description',
	'targetDate',
	'targetTime',
	'timeZone',
	'isAllDay',
	'isEnabled',
	'showWhenExpired',
	'startsAt',
	'endsAt',
	'sortOrder',
	'priority',
	'variant'
]);
const UPDATE_FIELDS = new Set([...CREATE_FIELDS].filter((field) => field !== 'id'));
const REORDER_FIELDS = new Set(['ids']);

const ID_RE = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_WITH_OFFSET_RE =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const unknownField = (
	value: Record<string, unknown>,
	allowedFields: Set<string>
): string | null => {
	const field = Object.keys(value).find((key) => !allowedFields.has(key));
	return field ? `Unknown field: ${field}` : null;
};

const isValidCalendarDate = (year: number, month: number, day: number): boolean => {
	const candidate = new Date(Date.UTC(year, month - 1, day));
	return (
		candidate.getUTCFullYear() === year &&
		candidate.getUTCMonth() === month - 1 &&
		candidate.getUTCDate() === day
	);
};

const isDateOnly = (value: string): boolean => {
	const match = value.match(DATE_ONLY_RE);
	if (!match) return false;
	return isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
};

const isDateTimeWithOffset = (value: string): boolean => {
	const match = value.match(DATE_TIME_WITH_OFFSET_RE);
	if (!match) return false;

	const [, year, month, day, hour, minute, second = '0'] = match;
	if (!isValidCalendarDate(Number(year), Number(month), Number(day))) return false;
	if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
	return Number.isFinite(new Date(value).getTime());
};

const isCanonicalTargetDate = (value: string): boolean =>
	isDateOnly(value) || isDateTimeWithOffset(value);

const parseRequiredString = (
	value: unknown,
	field: string,
	validate?: (value: string) => boolean,
	formatHint?: string
): ValidationResult<string> => {
	if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` };

	const next = value.trim();
	if (!next) return { ok: false, error: `${field} is required` };
	if (validate && !validate(next)) {
		return { ok: false, error: `${field} must be ${formatHint ?? 'valid'}` };
	}

	return { ok: true, data: next };
};

const parseNullableString = (
	value: unknown,
	field: string,
	validate?: (value: string) => boolean,
	formatHint?: string
): ValidationResult<string | null> => {
	if (value === null) return { ok: true, data: null };
	if (typeof value !== 'string') return { ok: false, error: `${field} must be a string or null` };

	const next = value.trim();
	if (!next) return { ok: true, data: null };
	if (validate && !validate(next)) {
		return { ok: false, error: `${field} must be ${formatHint ?? 'valid'}` };
	}

	return { ok: true, data: next };
};

const parseBoolean = (value: unknown, field: string): ValidationResult<boolean> =>
	typeof value === 'boolean'
		? { ok: true, data: value }
		: { ok: false, error: `${field} must be a boolean` };

const parseNullableInteger = (value: unknown, field: string): ValidationResult<number | null> => {
	if (value === null) return { ok: true, data: null };
	if (typeof value === 'number' && Number.isInteger(value)) return { ok: true, data: value };
	return { ok: false, error: `${field} must be an integer or null` };
};

const parseInteger = (value: unknown, field: string): ValidationResult<number> =>
	typeof value === 'number' && Number.isInteger(value)
		? { ok: true, data: value }
		: { ok: false, error: `${field} must be an integer` };

const isTargetTime = (value: string): boolean => {
	const match = value.match(TIME_RE);
	if (!match) return false;
	return Number(match[1]) <= 23 && Number(match[2]) <= 59;
};

const isVariant = (value: string): value is CountdownVariant =>
	(COUNTDOWN_VARIANTS as readonly string[]).includes(value);

const parseId = (value: unknown): ValidationResult<string> => {
	const parsed = parseRequiredString(value, 'id');
	if (!parsed.ok) return parsed;
	if (!ID_RE.test(parsed.data)) {
		return {
			ok: false,
			error:
				'id must start with a lowercase letter or number and contain only lowercase letters, numbers, underscores, or hyphens'
		};
	}
	return parsed;
};

const applySharedFields = <T extends CountdownUpdateInput>(
	raw: Record<string, unknown>,
	data: T
): ValidationResult<T> => {
	if ('label' in raw) {
		const parsed = parseRequiredString(raw.label, 'label');
		if (!parsed.ok) return parsed;
		data.label = parsed.data;
	}

	if ('description' in raw) {
		const parsed = parseNullableString(raw.description, 'description');
		if (!parsed.ok) return parsed;
		data.description = parsed.data;
	}

	if ('targetDate' in raw) {
		const parsed = parseRequiredString(
			raw.targetDate,
			'targetDate',
			isCanonicalTargetDate,
			'a date-only YYYY-MM-DD value or full ISO datetime with explicit offset'
		);
		if (!parsed.ok) return parsed;
		data.targetDate = parsed.data;
	}

	if ('targetTime' in raw) {
		const parsed = parseNullableString(raw.targetTime, 'targetTime', isTargetTime, 'HH:MM');
		if (!parsed.ok) return parsed;
		data.targetTime = parsed.data;
	}

	if ('timeZone' in raw) {
		const parsed = parseNullableString(
			raw.timeZone,
			'timeZone',
			isValidTimeZone,
			'an IANA timezone'
		);
		if (!parsed.ok) return parsed;
		data.timeZone = parsed.data;
	}

	if ('isAllDay' in raw) {
		const parsed = parseBoolean(raw.isAllDay, 'isAllDay');
		if (!parsed.ok) return parsed;
		data.isAllDay = parsed.data;
	}

	if ('isEnabled' in raw) {
		const parsed = parseBoolean(raw.isEnabled, 'isEnabled');
		if (!parsed.ok) return parsed;
		data.isEnabled = parsed.data;
	}

	if ('showWhenExpired' in raw) {
		const parsed = parseBoolean(raw.showWhenExpired, 'showWhenExpired');
		if (!parsed.ok) return parsed;
		data.showWhenExpired = parsed.data;
	}

	if ('startsAt' in raw) {
		const parsed = parseNullableString(raw.startsAt, 'startsAt', isDateOnly, 'YYYY-MM-DD');
		if (!parsed.ok) return parsed;
		data.startsAt = parsed.data;
	}

	if ('endsAt' in raw) {
		const parsed = parseNullableString(raw.endsAt, 'endsAt', isDateOnly, 'YYYY-MM-DD');
		if (!parsed.ok) return parsed;
		data.endsAt = parsed.data;
	}

	if ('sortOrder' in raw) {
		const parsed = parseNullableInteger(raw.sortOrder, 'sortOrder');
		if (!parsed.ok) return parsed;
		data.sortOrder = parsed.data;
	}

	if ('priority' in raw) {
		const parsed = parseInteger(raw.priority, 'priority');
		if (!parsed.ok) return parsed;
		data.priority = parsed.data;
	}

	if ('variant' in raw) {
		const parsed = parseRequiredString(raw.variant, 'variant');
		if (!parsed.ok) return parsed;
		if (!isVariant(parsed.data)) {
			return { ok: false, error: `variant must be ${COUNTDOWN_VARIANTS.join('|')}` };
		}
		data.variant = parsed.data;
	}

	if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) {
		return { ok: false, error: 'startsAt must be before or equal to endsAt' };
	}

	return { ok: true, data };
};

export const parseCountdownCreateInput = (
	value: unknown
): ValidationResult<CountdownCreateInput> => {
	if (!isRecord(value)) return { ok: false, error: 'Request body must be an object' };

	const fieldError = unknownField(value, CREATE_FIELDS);
	if (fieldError) return { ok: false, error: fieldError };

	let id: string | undefined;
	if ('id' in value) {
		const parsed = parseId(value.id);
		if (!parsed.ok) return parsed;
		id = parsed.data;
	}

	const label = parseRequiredString(value.label, 'label');
	if (!label.ok) return label;

	const targetDate = parseRequiredString(
		value.targetDate,
		'targetDate',
		isCanonicalTargetDate,
		'a date-only YYYY-MM-DD value or full ISO datetime with explicit offset'
	);
	if (!targetDate.ok) return targetDate;

	const data: CountdownCreateInput = {
		label: label.data,
		targetDate: targetDate.data
	};

	if (id) data.id = id;
	const shared = applySharedFields(value, data);
	return shared.ok ? { ok: true, data: shared.data as CountdownCreateInput } : shared;
};

export const parseCountdownUpdateInput = (
	value: unknown
): ValidationResult<CountdownUpdateInput> => {
	if (!isRecord(value)) return { ok: false, error: 'Request body must be an object' };

	const fieldError = unknownField(value, UPDATE_FIELDS);
	if (fieldError) return { ok: false, error: fieldError };
	if (!Object.keys(value).length) return { ok: false, error: 'At least one field is required' };

	return applySharedFields(value, {});
};

export const parseCountdownReorderInput = (
	value: unknown
): ValidationResult<CountdownReorderInput> => {
	if (!isRecord(value)) return { ok: false, error: 'Request body must be an object' };

	const fieldError = unknownField(value, REORDER_FIELDS);
	if (fieldError) return { ok: false, error: fieldError };
	if (!Array.isArray(value.ids)) return { ok: false, error: 'ids must be an array' };

	const ids: string[] = [];
	for (const rawId of value.ids) {
		const parsed = parseId(rawId);
		if (!parsed.ok) return parsed;
		if (ids.includes(parsed.data)) return { ok: false, error: `Duplicate id: ${parsed.data}` };
		ids.push(parsed.data);
	}

	if (!ids.length) return { ok: false, error: 'ids must not be empty' };
	return { ok: true, data: { ids } };
};
