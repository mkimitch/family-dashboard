import { calendarConfig, calendarDisplay, calendarSuppressions } from '$lib/config/calendars';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () =>
	json({
		calendars: calendarConfig,
		calendarDisplay,
		calendarSuppressions
	});
