import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const headers = { accept: 'application/json' } as const;

export const GET: RequestHandler = async ({ url }) => {
	const target = env.WX_URL ?? env.AGG_WEATHER_URL;
	if (!target) return new Response(null, { status: 204 });
	const u = new URL(target);
	for (const [k, v] of url.searchParams) u.searchParams.append(k, v);
	const r = await fetch(u, { headers, cache: 'no-store' });
	const body = await r.text();
	return new Response(body, {
		status: r.status,
		headers: { 'content-type': r.headers.get('content-type') ?? 'application/json; charset=utf-8' }
	});
};
