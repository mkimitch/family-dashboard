import { calendarConfig, calendarSuppressions } from '$lib/config/calendars';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () =>
	json({
		calendars: calendarConfig,
		calendarSuppressions
	});
