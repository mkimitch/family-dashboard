import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';

const SCHOOL_MENU_URL = 'http://svc-01.home.arpa:8790/api/school-menu/next';

export const GET: RequestHandler = async ({ url }) => {
	const target = env.SCHOOL_MENU_URL ?? SCHOOL_MENU_URL;

	try {
		const u = new URL(target);
		for (const [k, v] of url.searchParams) u.searchParams.append(k, v);
		const r = await fetch(u, {
			headers: { accept: 'application/json' },
			cache: 'no-store'
		});
		const body = await r.text();
		return new Response(body, {
			status: r.status,
			headers: { 'content-type': r.headers.get('content-type') ?? 'application/json; charset=utf-8' }
		});
	} catch (err) {
		console.error('School menu API fetch failed:', err);
		return new Response(JSON.stringify({ error: 'Failed to fetch school menu' }), {
			status: 502,
			headers: { 'content-type': 'application/json' }
		});
	}
};
