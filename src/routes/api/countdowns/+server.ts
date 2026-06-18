import { requireAdmin } from '$lib/server/auth';
import { errorResponse, jsonResponse, readJsonBody } from '$lib/server/countdowns/api';
import {
	CountdownConflictError,
	createCountdown,
	listAdminCountdowns
} from '$lib/server/countdowns/service';
import { parseCountdownCreateInput } from '$lib/server/countdowns/validation';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request }) => {
	const auth = requireAdmin(request);
	if (!auth.ok) return auth.response;

	try {
		return jsonResponse(await listAdminCountdowns());
	} catch (error) {
		console.error('Countdown admin list API failed:', error);
		return errorResponse('Failed to fetch countdowns', 500);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const auth = requireAdmin(request);
	if (!auth.ok) return auth.response;

	const body = await readJsonBody(request);
	if (!body.ok) return body.response;

	const parsed = parseCountdownCreateInput(body.data);
	if (!parsed.ok) return errorResponse(parsed.error, 400);

	try {
		return jsonResponse(await createCountdown(parsed.data), { status: 201 });
	} catch (error) {
		if (error instanceof CountdownConflictError) return errorResponse(error.message, 409);

		console.error('Countdown create API failed:', error);
		return errorResponse('Failed to create countdown', 500);
	}
};
