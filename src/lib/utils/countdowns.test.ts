import { resolveDateTimeDisplaySettings } from '$lib/config/dateTime';
import { MAX_VISIBLE_COUNTDOWNS, type CountdownItem } from '$lib/config/countdowns';
import { resolveCountdownItems } from './countdowns';
import { describe, expect, it } from 'vitest';

const chicagoDisplay = resolveDateTimeDisplaySettings({ timeZone: 'America/Chicago' });

describe('resolveCountdownItems', () => {
	it('resolves date-only targets for today and tomorrow', () => {
		const items: CountdownItem[] = [
			{ id: 'today', label: 'Today', targetDate: '2026-06-17' },
			{ id: 'tomorrow', label: 'Tomorrow', targetDate: '2026-06-18' }
		];

		const resolved = resolveCountdownItems(items, {
			now: new Date('2026-06-17T12:00:00-05:00'),
			dateTimeDisplay: chicagoDisplay,
			maxVisible: 10
		});
		const textById = new Map(resolved.map((item) => [item.id, item.remainingText]));

		expect(textById.get('today')).toBe('today');
		expect(textById.get('tomorrow')).toBe('tomorrow');
	});

	it('does not shift date-only targets through UTC parsing in far-offset display timezones', () => {
		const [resolved] = resolveCountdownItems(
			[{ id: 'target', label: 'Target', targetDate: '2026-06-18' }],
			{
				now: new Date('2026-06-18T10:00:00Z'),
				dateTimeDisplay: resolveDateTimeDisplaySettings({ timeZone: 'Etc/GMT+12' })
			}
		);

		expect(resolved.remainingText).toBe('tomorrow');
	});

	it('hides expired countdowns by default', () => {
		const resolved = resolveCountdownItems(
			[{ id: 'expired', label: 'Expired', targetDate: '2026-06-16' }],
			{
				now: new Date('2026-06-17T12:00:00-05:00'),
				dateTimeDisplay: chicagoDisplay
			}
		);

		expect(resolved).toHaveLength(0);
	});

	it('shows expired countdowns when showWhenExpired is true', () => {
		const [resolved] = resolveCountdownItems(
			[
				{
					id: 'expired',
					label: 'Expired',
					targetDate: '2026-06-16',
					showWhenExpired: true
				}
			],
			{
				now: new Date('2026-06-17T12:00:00-05:00'),
				dateTimeDisplay: chicagoDisplay
			}
		);

		expect(resolved.remainingText).toBe('ended');
	});

	it('keeps the max-visible limit at three', () => {
		const items: CountdownItem[] = Array.from({ length: 4 }, (_, index) => ({
			id: `event-${index}`,
			label: `Event ${index}`,
			targetDate: `2026-07-0${index + 1}`,
			sortOrder: index
		}));

		const resolved = resolveCountdownItems(items, {
			now: new Date('2026-06-17T12:00:00-05:00'),
			dateTimeDisplay: chicagoDisplay
		});

		expect(MAX_VISIBLE_COUNTDOWNS).toBe(3);
		expect(resolved).toHaveLength(MAX_VISIBLE_COUNTDOWNS);
		expect(resolved.map((item) => item.id)).toEqual(['event-0', 'event-1', 'event-2']);
	});
});
