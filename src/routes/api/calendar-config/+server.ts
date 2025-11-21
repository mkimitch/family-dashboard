import { readCalendarConfigs } from '$lib/server/configStore';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const list = await readCalendarConfigs();
	return new Response(JSON.stringify(list ?? []), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
	});
};
