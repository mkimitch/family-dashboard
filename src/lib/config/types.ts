export type CalendarConfig = {
	id: string;
	name?: string;
	color?: string;
	icon?: string;
	enabled?: boolean;
	sortOrder?: number;
};

export type CalendarOverlayEvent = {
	id?: string;
	title: string;
	startDate: string;
	endDate?: string;
	calendarId?: string;
	allDay?: boolean;
};

export type CalInfo = {
	id: string;
	name?: string;
	color?: string;
	icon?: string;
	sortOrder?: number;
};

export type CalEvent = {
	id?: string;
	title: string;
	start: string | number | Date;
	end?: string | number | Date;
	calendarId?: string;
	allDay?: boolean;
	rawStartYMD?: string | null;
	rawEndYMD?: string | null;
};

export type MergedEvent = CalEvent & {
	merged: true;
	sourceEvents: CalEvent[];
	sourceCalendarIds: string[];
};

export function isMerged(e: CalEvent): e is MergedEvent {
	return 'merged' in e && (e as any).merged === true;
}
