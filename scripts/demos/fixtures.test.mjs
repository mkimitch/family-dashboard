import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureFor, scenes, selectScenes } from './fixtures.mjs';

test('scene selection rejects typos instead of recording the wrong holiday', () => {
	assert.deepEqual(selectScenes([]), ['halloween', 'diwali']);
	assert.deepEqual(selectScenes(['diwali']), ['diwali']);
	assert.throws(() => selectScenes(['deepavali']), /Choose/);
	assert.throws(() => fixtureFor('unknown'), /Unknown/);
});

test('each fixture uses only synthetic identities and valid 45-minute events', () => {
	for (const name of Object.keys(scenes)) {
		const fixture = fixtureFor(name);
		const calendars = new Set(fixture['/api/calendars'].map((calendar) => calendar.id));
		const { events, zone } = fixture['/api/calendar'];
		assert.equal(zone, 'America/Chicago');
		assert.equal(new Set(events.map((event) => event.id)).size, events.length);
		for (const event of events) {
			assert(event.id.startsWith('demo-'));
			assert(calendars.has(event.calendarId));
			assert.equal(Date.parse(event.end) - Date.parse(event.start), 45 * 60 * 1000);
		}
		assert.deepEqual(fixture['/api/photos'], { files: [] });
		assert.deepEqual(fixture['/api/calendar-config'].calendarSuppressions, []);
	}
});

test('morning fixture events stay at 9 AM across the Chicago DST boundary', () => {
	const format = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Chicago',
		hour: 'numeric',
		minute: '2-digit',
		hour12: false
	});
	for (const name of Object.keys(scenes)) {
		for (const event of fixtureFor(name)['/api/calendar'].events.filter(
			(event) => event.title === 'Morning Walk'
		)) {
			assert.equal(format.format(new Date(event.start)), '09:00');
		}
	}
});

test('main celebrations have the specified dates and Diwali retains its uncrowded art', () => {
	assert.equal(scenes.halloween.date, '2026-10-31');
	assert.equal(scenes.diwali.date, '2026-11-08');
	const main = fixtureFor('diwali')['/api/calendar'].events.filter((event) =>
		event.start.startsWith(scenes.diwali.date)
	);
	assert.equal(main.length, 3);
	assert(main.some((event) => event.title === 'Diya Lighting'));
});
