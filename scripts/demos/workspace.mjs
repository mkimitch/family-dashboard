import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { root } from './common.mjs';

export const prepareFixtureWorkspace = async (workspace) => {
	// Copy the real UI verbatim, but never any production server code, environment
	// files, photos, databases, or configured calendar/countdown data.
	await mkdir(join(workspace, 'src/routes'), { recursive: true });
	await mkdir(join(workspace, 'static'), { recursive: true });
	await cp(join(root, 'src/lib'), join(workspace, 'src/lib'), {
		recursive: true,
		filter: (path) => {
			const name = relative(join(root, 'src/lib'), path).replaceAll('\\', '/');
			return (
				!/^(server|config\/(calendars|countdowns)\.ts)(\/|$)/.test(name) &&
				!name.endsWith('.test.ts')
			);
		}
	});
	for (const path of [
		'src/app.html',
		'src/app.css',
		'src/routes/+layout.svelte',
		'src/routes/+page.svelte',
		'svelte.config.js',
		'tsconfig.json',
		'static/error-logger.js',
		'static/manifest.webmanifest',
		'static/daymark.svg',
		'static/daymark-app.svg'
	])
		await cp(join(root, path), join(workspace, path));
	await cp(join(root, 'static/assets'), join(workspace, 'static/assets'), { recursive: true });
	await mkdir(join(workspace, 'static/svg/static'), { recursive: true });
	for (const icon of ['rpi.svg', 'server.svg']) {
		await cp(join(root, 'static/svg/static', icon), join(workspace, 'static/svg/static', icon));
	}
	await writeFile(join(workspace, 'package.json'), '{"type":"module","private":true}');
	await writeFile(
		join(workspace, 'src/lib/config/countdowns.ts'),
		'export const MAX_VISIBLE_COUNTDOWNS = 3; export default [];\n'
	);
	await writeFile(
		join(workspace, 'src/routes/+layout.server.ts'),
		`
import { DATE_TIME_APP_DEFAULTS } from '$lib/config/dateTime';
export const load = () => ({ photos: [], weather: null, schoolMenu: null,
  dateTimeDisplay: DATE_TIME_APP_DEFAULTS });
`
	);
	await writeFile(
		join(workspace, 'src/routes/+page.server.ts'),
		'export const load = () => ({ countdowns: [] });\n'
	);
	await writeFile(
		join(workspace, 'src/hooks.server.ts'),
		`
import { readFile } from 'node:fs/promises';
export const handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    const fixtures = JSON.parse(await readFile('./fixture.json', 'utf8'));
    if (!Object.hasOwn(fixtures, event.url.pathname))
      return new Response('Unknown demo endpoint', { status: 404 });
    return Response.json(fixtures[event.url.pathname]);
  }
  return resolve(event);
};
export const handleFetch = () => { throw new Error('Network fetching is disabled in demos'); };
`
	);
};
