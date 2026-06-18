import { resolveRequestDateTimeDisplaySettings } from '$lib/server/dateTime';
import { errorResponse, jsonResponse } from '$lib/server/countdowns/api';
import { listVisibleCountdownItems } from '$lib/server/countdowns/service';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	try {
		const dateTimeDisplay = resolveRequestDateTimeDisplaySettings();
		const countdowns = await listVisibleCountdownItems({ dateTimeDisplay });
		return jsonResponse(countdowns);
	} catch (error) {
		console.error('Countdown visible API failed:', error);
		return errorResponse('Failed to fetch countdowns', 500);
	}
};
