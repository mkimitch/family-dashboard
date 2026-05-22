import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';

const headersBase: Record<string, string> = { accept: 'application/json' };

const resolveTasksUrl = (): string | null => {
	if (env.TASKS_URL) return env.TASKS_URL;
	if (!env.CAL_URL) return null;

	const target = new URL(env.CAL_URL);
	if (/\/events(\/|$)/.test(target.pathname)) {
		target.pathname = target.pathname.replace(/\/events(\/|$)/, '/tasks$1');
	} else {
		target.pathname = '/v1/tasks';
	}
	target.search = '';
	return target.toString();
};

export const GET: RequestHandler = async ({ url }) => {
	const upstream = resolveTasksUrl();
	if (!upstream) {
		return new Response(JSON.stringify({ error: 'Missing TASKS_URL or CAL_URL' }), {
			status: 500,
			headers: { 'content-type': 'application/json; charset=utf-8' }
		});
	}

	try {
		const target = new URL(upstream);
		for (const [key, value] of url.searchParams) {
			target.searchParams.append(key, value);
		}
		if (!target.searchParams.has('clientZone') && env.CAL_CLIENT_ZONE) {
			target.searchParams.set('clientZone', env.CAL_CLIENT_ZONE);
		}
		const headers = { ...headersBase };
		if (env.CAL_API_KEY) headers['X-API-Key'] = env.CAL_API_KEY;
		const response = await fetch(target, { headers, cache: 'no-store' });
		const body = await response.text();
		return new Response(body, {
			status: response.status,
			headers: {
				'content-type': response.headers.get('content-type') ?? 'application/json; charset=utf-8'
			}
		});
	} catch (error) {
		console.error('Tasks API fetch failed:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch task data' }), {
			status: 502,
			headers: { 'content-type': 'application/json; charset=utf-8' }
		});
	}
};
