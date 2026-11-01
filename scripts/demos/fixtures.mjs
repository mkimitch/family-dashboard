// Deliberately fictional. These fixtures are never imported by production code.
export const scenes = {
	halloween: {
		date: '2026-10-31',
		anchor: '2026-10-29',
		offset: '-05:00',
		title: 'Halloween',
		caption: 'October 31, 2026',
		events: [
			['09:00', 'Pumpkin Decorating'],
			['11:30', 'Fall Festival'],
			['15:00', 'Costume Parade'],
			['17:30', 'Trick-or-Treating'],
			['19:30', 'Halloween Movie Night']
		]
	},
	diwali: {
		date: '2026-11-08',
		anchor: '2026-11-03',
		offset: '-06:00',
		title: 'Diwali / Deepavali',
		caption: 'November 8, 2026',
		// Four events trigger the real component's crowded-cell treatment, hiding
		// the lantern. Keep three here; preparations are on the preceding day.
		events: [
			['16:00', 'Family Celebration'],
			['18:00', 'Diya Lighting'],
			['19:30', 'Diwali Dinner']
		]
	}
};

export const selectScenes = (args) => {
	if (!args.length || (args.length === 1 && args[0] === 'all')) return Object.keys(scenes);
	if (args.some((name) => !Object.hasOwn(scenes, name))) {
		throw new Error('Choose halloween, diwali, or all.');
	}
	return [...new Set(args)];
};

export const fixtureFor = (name) => {
	const scene = scenes[name];
	if (!scene) throw new Error(`Unknown demo scene: ${name}`);
	const events = [];
	const add = (date, time, title, calendarId = 'demo-celebrations') => {
		// These 2026 fixtures straddle Chicago's November 1 DST boundary.
		const offset = date < '2026-11-01' ? '-05:00' : '-06:00';
		const start = `${date}T${time}:00${offset}`;
		events.push({
			id: `demo-${events.length}`,
			title,
			calendarId,
			start,
			end: new Date(Date.parse(start) + 45 * 60 * 1000).toISOString()
		});
	};
	scene.events.forEach(([time, title]) => add(scene.date, time, title));
	for (let day = 0; day < 7; day++) {
		// UTC arithmetic here generates ISO civil dates only, never UI instants.
		const date = new Date(Date.parse(`${scene.anchor}T12:00:00Z`) + day * 86400000)
			.toISOString()
			.slice(0, 10);
		if (date === scene.date) continue;
		add(date, '09:00', 'Morning Walk', 'demo-plans');
		add(date, '17:00', 'Library Visit', 'demo-plans');
		if (day === 0) {
			[
				'Market Visit',
				'Craft Workshop',
				'Garden Time',
				'Reading Time',
				'Pick up Supplies',
				'Bake Cookies'
			].forEach((title, i) => add(date, `${10 + i}:30`, title, 'demo-plans'));
		}
		if (name === 'diwali' && date === '2026-11-07') {
			add(date, '11:00', 'Rangoli Decorating');
		}
	}
	return {
		'/api/calendars': [
			{ id: 'demo-celebrations', name: 'Celebrations', color: '#dcad63' },
			{ id: 'demo-plans', name: 'Everyday Plans', color: '#88aed4' }
		],
		'/api/calendar-config': {
			calendars: [],
			calendarDisplay: { weeks: 1, anchor: 'rolling' },
			calendarSuppressions: []
		},
		'/api/calendar': { events, zone: 'America/Chicago' },
		'/api/calendar-overlays': [],
		'/api/tasks': [],
		'/api/photos': { files: [] },
		'/api/weather': null,
		'/api/server-sysinfo': {}
	};
};
