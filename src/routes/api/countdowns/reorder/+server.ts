import { requireAdmin } from '$lib/server/auth';
import { errorResponse, jsonResponse, readJsonBody } from '$lib/server/countdowns/api';
import {
	CountdownNotFoundError,
	CountdownValidationError,
	reorderCountdowns
} from '$lib/server/countdowns/service';
import { parseCountdownReorderInput } from '$lib/server/countdowns/validation';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	const auth = requireAdmin(request);
	if (!auth.ok) return auth.response;

	const body = await readJsonBody(request);
	if (!body.ok) return body.response;

	const parsed = parseCountdownReorderInput(body.data);
	if (!parsed.ok) return errorResponse(parsed.error, 400);

	try {
		return jsonResponse(await reorderCountdowns(parsed.data.ids));
	} catch (error) {
		if (error instanceof CountdownNotFoundError) return errorResponse(error.message, 404);
		if (error instanceof CountdownValidationError) return errorResponse(error.message, 400);

		console.error('Countdown reorder API failed:', error);
		return errorResponse('Failed to reorder countdowns', 500);
	}
};
