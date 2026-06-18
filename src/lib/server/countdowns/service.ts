import type { CountdownItem, CountdownVariant } from '$lib/config/countdowns';
import type { ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
import type { CountdownInsert, CountdownRow } from '$lib/server/db/schema';
import { resolveCountdownItems } from '$lib/utils/countdowns';
import {
	createCountdownRepository,
	type CountdownRepository,
	type CountdownRowUpdate
} from './repository';
import type { CountdownCreateInput, CountdownUpdateInput } from './validation';

export type CountdownDto = {
	id: string;
	label: string;
	description: string | null;
	targetDate: string;
	targetTime: string | null;
	timeZone: string | null;
	isAllDay: boolean;
	isEnabled: boolean;
	showWhenExpired: boolean;
	startsAt: string | null;
	endsAt: string | null;
	sortOrder: number | null;
	priority: number;
	variant: CountdownVariant;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
};

export class CountdownConflictError extends Error {}
export class CountdownNotFoundError extends Error {}
export class CountdownValidationError extends Error {}

const defaultRepository = createCountdownRepository();
const ID_FALLBACK_PREFIX = 'countdown';

export const mapCountdownRowToItem = (row: CountdownRow): CountdownItem => {
	const item: CountdownItem = {
		id: row.id,
		label: row.label,
		targetDate: row.targetDate
	};

	if (!row.isEnabled) item.enabled = false;
	if (row.sortOrder !== null) item.sortOrder = row.sortOrder;
	if (row.showWhenExpired) item.showWhenExpired = true;
	if (row.startsAt) item.startsAt = row.startsAt;
	if (row.endsAt) item.endsAt = row.endsAt;
	if (row.variant !== 'default') item.variant = row.variant;

	return item;
};

export const mapCountdownRowToDto = (row: CountdownRow): CountdownDto => ({
	id: row.id,
	label: row.label,
	description: row.description,
	targetDate: row.targetDate,
	targetTime: row.targetTime,
	timeZone: row.timeZone,
	isAllDay: row.isAllDay,
	isEnabled: row.isEnabled,
	showWhenExpired: row.showWhenExpired,
	startsAt: row.startsAt,
	endsAt: row.endsAt,
	sortOrder: row.sortOrder,
	priority: row.priority,
	variant: row.variant,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
	deletedAt: row.deletedAt
});

const slugify = (value: string): string => {
	const slug = value
		.normalize('NFKD')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || `${ID_FALLBACK_PREFIX}-${Date.now().toString(36)}`;
};

const getUniqueId = async (
	repository: CountdownRepository,
	label: string,
	suppliedId?: string
): Promise<string> => {
	if (suppliedId) {
		if (await repository.getById(suppliedId)) {
			throw new CountdownConflictError(`Countdown "${suppliedId}" already exists`);
		}
		return suppliedId;
	}

	const baseId = slugify(label);
	for (let index = 0; index < 100; index += 1) {
		const candidate = index === 0 ? baseId : `${baseId}-${index + 1}`;
		if (!(await repository.getById(candidate))) return candidate;
	}

	return `${baseId}-${Date.now().toString(36)}`;
};

const toInsert = async (
	input: CountdownCreateInput,
	repository: CountdownRepository,
	now: number
): Promise<CountdownInsert> => ({
	id: await getUniqueId(repository, input.label, input.id),
	label: input.label,
	description: input.description ?? null,
	targetDate: input.targetDate,
	targetTime: input.targetTime ?? null,
	timeZone: input.timeZone ?? null,
	isAllDay: input.isAllDay ?? true,
	isEnabled: input.isEnabled ?? true,
	showWhenExpired: input.showWhenExpired ?? false,
	startsAt: input.startsAt ?? null,
	endsAt: input.endsAt ?? null,
	sortOrder: input.sortOrder ?? null,
	priority: input.priority ?? 0,
	variant: input.variant ?? 'default',
	createdAt: now,
	updatedAt: now,
	deletedAt: null
});

const toUpdate = (input: CountdownUpdateInput, now: number): CountdownRowUpdate => {
	const update: CountdownRowUpdate = { updatedAt: now };

	if (input.label !== undefined) update.label = input.label;
	if (input.description !== undefined) update.description = input.description;
	if (input.targetDate !== undefined) update.targetDate = input.targetDate;
	if (input.targetTime !== undefined) update.targetTime = input.targetTime;
	if (input.timeZone !== undefined) update.timeZone = input.timeZone;
	if (input.isAllDay !== undefined) update.isAllDay = input.isAllDay;
	if (input.isEnabled !== undefined) update.isEnabled = input.isEnabled;
	if (input.showWhenExpired !== undefined) update.showWhenExpired = input.showWhenExpired;
	if (input.startsAt !== undefined) update.startsAt = input.startsAt;
	if (input.endsAt !== undefined) update.endsAt = input.endsAt;
	if (input.sortOrder !== undefined) update.sortOrder = input.sortOrder;
	if (input.priority !== undefined) update.priority = input.priority;
	if (input.variant !== undefined) update.variant = input.variant;

	return update;
};

export const listHeroCountdownItems = async (
	repository: CountdownRepository = defaultRepository
): Promise<CountdownItem[]> => {
	const rows = await repository.listHero();
	return rows.map(mapCountdownRowToItem);
};

export const listVisibleCountdownItems = async (
	options: {
		dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null;
		now?: Date;
		repository?: CountdownRepository;
	} = {}
): Promise<CountdownItem[]> => {
	const items = await listHeroCountdownItems(options.repository ?? defaultRepository);
	const visibleIds = resolveCountdownItems(items, {
		now: options.now,
		dateTimeDisplay: options.dateTimeDisplay
	}).map((item) => item.id);
	const itemById = new Map(items.map((item) => [item.id, item]));

	return visibleIds.flatMap((id) => {
		const item = itemById.get(id);
		return item ? [item] : [];
	});
};

export const listAdminCountdowns = async (
	repository: CountdownRepository = defaultRepository
): Promise<CountdownDto[]> => {
	const rows = await repository.listAll();
	return rows.map(mapCountdownRowToDto);
};

export const getAdminCountdown = async (
	id: string,
	repository: CountdownRepository = defaultRepository
): Promise<CountdownDto | null> => {
	const row = await repository.getById(id);
	return row ? mapCountdownRowToDto(row) : null;
};

export const createCountdown = async (
	input: CountdownCreateInput,
	repository: CountdownRepository = defaultRepository
): Promise<CountdownDto> => {
	const now = Date.now();
	const row = await repository.create(await toInsert(input, repository, now));
	return mapCountdownRowToDto(row);
};

export const updateCountdown = async (
	id: string,
	input: CountdownUpdateInput,
	repository: CountdownRepository = defaultRepository
): Promise<CountdownDto | null> => {
	const existing = await repository.getById(id);
	if (!existing) return null;

	// startsAt/endsAt are validated as date-only strings, so the effective window
	// must be re-checked against the stored record when a PATCH touches only one side.
	const startsAt = input.startsAt !== undefined ? input.startsAt : existing.startsAt;
	const endsAt = input.endsAt !== undefined ? input.endsAt : existing.endsAt;
	if (startsAt && endsAt && startsAt > endsAt) {
		throw new CountdownValidationError('startsAt must be before or equal to endsAt');
	}

	const row = await repository.update(id, toUpdate(input, Date.now()));
	return row ? mapCountdownRowToDto(row) : null;
};

export const softDeleteCountdown = async (
	id: string,
	repository: CountdownRepository = defaultRepository
): Promise<CountdownDto | null> => {
	const row = await repository.softDelete(id, Date.now());
	return row ? mapCountdownRowToDto(row) : null;
};

export const reorderCountdowns = async (
	ids: string[],
	repository: CountdownRepository = defaultRepository
): Promise<CountdownDto[]> => {
	// Reorder is a full-list operation: `ids` must be exactly the set of active
	// (non-deleted) countdowns, in the desired order. Requiring the complete set
	// guarantees a unique 1..N `sortOrder` and avoids ambiguous partial reorders.
	const rows = await repository.listAll();
	const activeIds = rows.flatMap((row) => (row.deletedAt === null ? [row.id] : []));
	const activeIdSet = new Set(activeIds);

	const unknownId = ids.find((id) => !activeIdSet.has(id));
	if (unknownId) throw new CountdownNotFoundError(`Countdown "${unknownId}" was not found`);

	const providedIdSet = new Set(ids);
	const missingId = activeIds.find((id) => !providedIdSet.has(id));
	if (missingId) {
		throw new CountdownValidationError(
			`Reorder must include every active countdown; missing "${missingId}"`
		);
	}

	await repository.reorder(ids, Date.now());
	return listAdminCountdowns(repository);
};
