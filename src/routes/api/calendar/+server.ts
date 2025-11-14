import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';

const headersBase: Record<string, string> = { accept: 'application/json' };

export const GET: RequestHandler = async ({ url }) => {
	const upstream = env.CAL_URL;
	if (!upstream) {
		return new Response(JSON.stringify({ error: 'Missing CAL_URL' }), {
			status: 500,
			headers: { 'content-type': 'application/json; charset=utf-8' }
		});
	}
	const target = new URL(upstream);
	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');
	if (startParam && endParam) {
		target.searchParams.set('start', startParam);
		target.searchParams.set('end', endParam);
	} else {
		const weeksRaw = Number(url.searchParams.get('weeks') ?? 3);
		const weeks = Number.isFinite(weeksRaw) ? Math.max(1, Math.min(8, weeksRaw)) : 3;
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const dow = startOfToday.getDay();
		const start = new Date(startOfToday);
		start.setDate(start.getDate() - dow);
		const end = new Date(start);
		end.setDate(start.getDate() + weeks * 7);
		target.searchParams.set('start', start.toISOString());
		target.searchParams.set('end', end.toISOString());
	}

	for (const [k, v] of url.searchParams) {
		if (k === 'weeks') continue;
		if (k === 'start' || k === 'end') continue;
		target.searchParams.append(k, v);
	}
	if (!target.searchParams.has('clientZone') && env.CAL_CLIENT_ZONE) {
		target.searchParams.set('clientZone', env.CAL_CLIENT_ZONE);
	}
	const headers = { ...headersBase };
	if (env.CAL_API_KEY) headers['X-API-Key'] = env.CAL_API_KEY;
	const r = await fetch(target, { headers, cache: 'no-store' });
	const body = await r.text();
	return new Response(body, {
		status: r.status,
		headers: { 'content-type': r.headers.get('content-type') ?? 'application/json; charset=utf-8' }
	});
};
