import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const headersBase: Record<string, string> = { accept: 'application/json' };

export const GET: RequestHandler = async () => {
	try {
		let target: string | undefined = env.CAL_CALENDARS_URL;
		const eventsUrl = env.CAL_URL;
		if (!target && eventsUrl) {
			try {
				const u = new URL(eventsUrl);
				if (/\/events(\/|$)/.test(u.pathname)) {
					u.pathname = u.pathname.replace(/\/events(\/|$)/, '/calendars$1');
				} else {
					u.pathname = '/v1/calendars';
				}
				u.search = '';
				target = u.toString();
			} catch {}
		}
		if (!target)
			return new Response(JSON.stringify([]), {
				status: 200,
				headers: { 'content-type': 'application/json; charset=utf-8' }
			});
		const headers = { ...headersBase };
		if (env.CAL_API_KEY) headers['X-API-Key'] = env.CAL_API_KEY;
		const r = await fetch(target, { headers, cache: 'no-store' });
		const body = await r.text();
		return new Response(body, {
			status: r.status,
			headers: {
				'content-type': r.headers.get('content-type') ?? 'application/json; charset=utf-8'
			}
		});
	} catch {
		return new Response(JSON.stringify([]), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8' }
		});
	}
};
