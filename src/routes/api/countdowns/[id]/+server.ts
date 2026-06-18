import { requireAdmin } from '$lib/server/auth';
import { errorResponse, jsonResponse, readJsonBody } from '$lib/server/countdowns/api';
import {
	CountdownValidationError,
	getAdminCountdown,
	softDeleteCountdown,
	updateCountdown
} from '$lib/server/countdowns/service';
import { parseCountdownUpdateInput } from '$lib/server/countdowns/validation';
import type { RequestHandler } from '@sveltejs/kit';

const getId = (params: Partial<Record<string, string>>): string | null => params.id?.trim() || null;

export const GET: RequestHandler = async ({ params, request }) => {
	const auth = requireAdmin(request);
	if (!auth.ok) return auth.response;

	const id = getId(params);
	if (!id) return errorResponse('Countdown not found', 404);

	try {
		const countdown = await getAdminCountdown(id);
		return countdown ? jsonResponse(countdown) : errorResponse('Countdown not found', 404);
	} catch (error) {
		console.error('Countdown get API failed:', error);
		return errorResponse('Failed to fetch countdown', 500);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const auth = requireAdmin(request);
	if (!auth.ok) return auth.response;

	const id = getId(params);
	if (!id) return errorResponse('Countdown not found', 404);

	const body = await readJsonBody(request);
	if (!body.ok) return body.response;

	const parsed = parseCountdownUpdateInput(body.data);
	if (!parsed.ok) return errorResponse(parsed.error, 400);

	try {
		const countdown = await updateCountdown(id, parsed.data);
		return countdown ? jsonResponse(countdown) : errorResponse('Countdown not found', 404);
	} catch (error) {
		if (error instanceof CountdownValidationError) return errorResponse(error.message, 400);

		console.error('Countdown update API failed:', error);
		return errorResponse('Failed to update countdown', 500);
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const auth = requireAdmin(request);
	if (!auth.ok) return auth.response;

	const id = getId(params);
	if (!id) return errorResponse('Countdown not found', 404);

	try {
		const countdown = await softDeleteCountdown(id);
		return countdown ? jsonResponse(countdown) : errorResponse('Countdown not found', 404);
	} catch (error) {
		console.error('Countdown delete API failed:', error);
		return errorResponse('Failed to delete countdown', 500);
	}
};
