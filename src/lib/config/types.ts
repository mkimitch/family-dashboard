export type ScheduleRule = {
	id: string;
	label?: string;
	startDate?: string; // YYYY-MM-DD (optional; if omitted, treated as "from the beginning")
	endDate?: string; // YYYY-MM-DD (inclusive)
	startTime?: string; // HH:MM (local time)
	endTime?: string; // HH:MM (local time)
	daysOfWeek?: number[]; // 0 (Sun) - 6 (Sat)
};

export type CalendarConfig = {
	id: string;
	name?: string;
	color?: string;
	icon?: string;
	enabled: boolean;
	sortOrder?: number;
};

export type CalendarOverlayEvent = {
	id: string;
	title: string;
	startDate: string; // YYYY-MM-DD
	endDate?: string; // YYYY-MM-DD
	allDay?: boolean;
	calendarId?: string;
};

export type CountdownConfig = {
	id: string;
	label: string;
	targetDateTime: string; // e.g. 2025-01-01T12:00
	description?: string;
	schedules?: ScheduleRule[];
	priority?: number;
	enabled?: boolean;
};

export type HeroMessageConfig = {
	id: string;
	title: string;
	subtitle?: string;
	alerts?: string[];
	schedules?: ScheduleRule[];
	wallpaperMode?: 'default' | 'override';
	wallpaperPhotos?: string[];
	priority?: number;
	enabled?: boolean;
};
