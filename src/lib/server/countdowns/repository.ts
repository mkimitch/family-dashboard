import { db as defaultDb, type CountdownDatabase } from '$lib/server/db';
import { countdowns, type CountdownInsert, type CountdownRow } from '$lib/server/db/schema';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

export type CountdownRowUpdate = Partial<Omit<CountdownInsert, 'createdAt' | 'id'>> & {
	updatedAt: number;
};

const sortOrderNullsLast = sql`${countdowns.sortOrder} is null`;
const deletedRowsLast = sql`${countdowns.deletedAt} is not null`;

export const createCountdownRepository = (database: CountdownDatabase = defaultDb) => {
	const listAll = async (): Promise<CountdownRow[]> =>
		database
			.select()
			.from(countdowns)
			.orderBy(
				deletedRowsLast,
				sortOrderNullsLast,
				asc(countdowns.sortOrder),
				asc(countdowns.targetDate),
				asc(countdowns.label),
				asc(countdowns.id)
			);

	const listHero = async (): Promise<CountdownRow[]> =>
		database
			.select()
			.from(countdowns)
			.where(and(isNull(countdowns.deletedAt), eq(countdowns.isEnabled, true)))
			.orderBy(
				sortOrderNullsLast,
				asc(countdowns.sortOrder),
				asc(countdowns.targetDate),
				asc(countdowns.label),
				asc(countdowns.id)
			);

	const listByIds = async (ids: string[]): Promise<CountdownRow[]> => {
		if (!ids.length) return [];
		return database.select().from(countdowns).where(inArray(countdowns.id, ids));
	};

	const getById = async (id: string): Promise<CountdownRow | null> => {
		const rows = await database.select().from(countdowns).where(eq(countdowns.id, id)).limit(1);
		return rows[0] ?? null;
	};

	const create = async (value: CountdownInsert): Promise<CountdownRow> => {
		const rows = await database.insert(countdowns).values(value).returning();
		return rows[0];
	};

	const update = async (id: string, value: CountdownRowUpdate): Promise<CountdownRow | null> => {
		const rows = await database
			.update(countdowns)
			.set(value)
			.where(eq(countdowns.id, id))
			.returning();
		return rows[0] ?? null;
	};

	const softDelete = async (id: string, now: number): Promise<CountdownRow | null> => {
		const rows = await database
			.update(countdowns)
			.set({ deletedAt: now, updatedAt: now })
			.where(eq(countdowns.id, id))
			.returning();
		return rows[0] ?? null;
	};

	const reorder = async (ids: string[], now: number): Promise<void> => {
		await database.transaction(async (tx) => {
			for (const [index, id] of ids.entries()) {
				await tx
					.update(countdowns)
					.set({ sortOrder: index + 1, updatedAt: now })
					.where(eq(countdowns.id, id));
			}
		});
	};

	return {
		create,
		getById,
		listAll,
		listByIds,
		listHero,
		reorder,
		softDelete,
		update
	};
};

export type CountdownRepository = ReturnType<typeof createCountdownRepository>;
