import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const COUNTDOWN_VARIANTS = ['default', 'subtle', 'accent'] as const;

/**
 * Countdown events table.
 *
 * Date fields are stored as TEXT and routed unchanged through the existing
 * `resolveCountdownItems()` logic. `targetDate` is the canonical value and maps
 * 1:1 to `CountdownItem.targetDate` (date-only `YYYY-MM-DD` or full ISO datetime
 * with explicit offset). `targetTime`/`timeZone`/`isAllDay` are stored metadata
 * for a future admin form and are not composed into `targetDate` in Phase 1.
 */
export const countdowns = sqliteTable(
	'countdowns',
	{
		id: text('id').primaryKey(),
		label: text('label').notNull(),
		description: text('description'),
		targetDate: text('target_date').notNull(),
		targetTime: text('target_time'),
		timeZone: text('time_zone'),
		isAllDay: integer('is_all_day', { mode: 'boolean' }).notNull().default(true),
		isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
		showWhenExpired: integer('show_when_expired', { mode: 'boolean' }).notNull().default(false),
		startsAt: text('starts_at'),
		endsAt: text('ends_at'),
		sortOrder: integer('sort_order'),
		priority: integer('priority').notNull().default(0),
		variant: text('variant', { enum: COUNTDOWN_VARIANTS }).notNull().default('default'),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull(),
		deletedAt: integer('deleted_at')
	},
	(table) => [index('countdowns_visible_idx').on(table.deletedAt, table.isEnabled, table.sortOrder)]
);

export type CountdownRow = typeof countdowns.$inferSelect;
export type CountdownInsert = typeof countdowns.$inferInsert;
