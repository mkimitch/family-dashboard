import assert from 'node:assert/strict';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const metadata = JSON.parse(await readFile(new URL('./us-calendar.json', import.meta.url)));
const holiday = {
	id: 'fixture-thanksgiving-day',
	title: 'Thanksgiving Day',
	allDay: true,
	start: '2026-11-26',
	end: '2026-11-27'
};
const densityExtra = {
	id: 'fixture-thanksgiving-crafts',
	calendarId: 'family',
	title: 'Make place cards',
	start: '2026-11-26T15:00:00-06:00',
	end: '2026-11-26T16:00:00-06:00'
};

export const setFixture = (data, dense = false) => {
	const calendars = data['/api/calendars'];
	const events = data['/api/calendar'].events;
	assert(
		events.every((e) => e.id.startsWith('fixture-')) && calendars.some((c) => c.id === 'family')
	);
	let calendar = calendars.find(
		(c) => c.id === metadata.id || /^(US|US Holidays)$/i.test(c.label ?? c.name)
	);
	if (!calendar) {
		calendar = metadata;
		calendars.push(calendar);
	}
	const keep = events.filter(
		(e) =>
			e.id !== densityExtra.id &&
			!(e.start === holiday.start && e.allDay && /^Thanksgiving( Day)?$/i.test(e.title))
	);
	data['/api/calendar'].events = [
		...keep,
		{ ...holiday, calendarId: calendar.id },
		...(dense ? [densityExtra] : [])
	];
	return data;
};

export const showcaseFixturePath = async () => {
	const dir = fileURLToPath(new URL('../../../../artifacts/thanksgiving/', import.meta.url));
	const workspace = (await readFile(join(dir, 'motion-preview-workspace.txt'), 'utf8')).trim();
	assert(dirname(workspace) === resolve(dir) && /\/\.app-[\w-]+$/.test(workspace));
	return join(workspace, 'fixture.json');
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const mode = process.argv[2] ?? 'sparse';
	assert(['sparse', 'dense'].includes(mode));
	const path = await showcaseFixturePath();
	const data = setFixture(JSON.parse(await readFile(path)), mode === 'dense');
	const temp = path + '.showcase-' + process.pid;
	await writeFile(temp, JSON.stringify(data), { flag: 'wx' });
	await rename(temp, path);
	console.log('Updated standalone Thanksgiving fixture:', mode);
}
