import type { CountdownRow } from '$lib/server/db/schema';
import { mapCountdownRowToItem } from './service';
import { describe, expect, it } from 'vitest';

const baseRow = {
	id: 'summer-vacation',
	label: 'Summer vacation starts',
	description: null,
	targetDate: '2026-06-12T15:00:00-05:00',
	targetTime: null,
	timeZone: null,
	isAllDay: true,
	isEnabled: true,
	showWhenExpired: false,
	startsAt: null,
	endsAt: null,
	sortOrder: null,
	priority: 0,
	variant: 'default',
	createdAt: 1,
	updatedAt: 1,
	deletedAt: null
} satisfies CountdownRow;

describe('mapCountdownRowToItem', () => {
	it('preserves the existing CountdownItem shape for default rows', () => {
		expect(mapCountdownRowToItem(baseRow)).toEqual({
			id: 'summer-vacation',
			label: 'Summer vacation starts',
			targetDate: '2026-06-12T15:00:00-05:00'
		});
	});

	it('maps optional display fields only when they affect the hero view model', () => {
		expect(
			mapCountdownRowToItem({
				...baseRow,
				isEnabled: false,
				showWhenExpired: true,
				startsAt: '2026-06-01',
				endsAt: '2026-06-13',
				sortOrder: 2,
				variant: 'accent'
			})
		).toEqual({
			id: 'summer-vacation',
			label: 'Summer vacation starts',
			targetDate: '2026-06-12T15:00:00-05:00',
			enabled: false,
			showWhenExpired: true,
			startsAt: '2026-06-01',
			endsAt: '2026-06-13',
			sortOrder: 2,
			variant: 'accent'
		});
	});
});
