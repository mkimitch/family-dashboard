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

export type OmniCalTask = {
	id: string;
	taskListId: string;
	taskId: string;
	title: string;
	notes: string | null;
	status: 'needsAction' | 'completed' | string;
	dueIso: string | null;
	completedIso: string | null;
	deleted: boolean;
	hidden: boolean;
	position: string;
	parent: string | null;
	updatedAt: number;
};

export type DashboardTask = {
	id: string;
	taskListId: string;
	taskId: string;
	title: string;
	notes: string | null;
	status: string;
	dueIso: string | null;
	dateKey: string | null;
	isAllDay: boolean;
	isCompleted: boolean;
	isDeleted: boolean;
	isHidden: boolean;
	isOverdue: boolean;
	position: string;
	parent: string | null;
	updatedAt: number;
};

export type MergedEvent = CalEvent & {
	merged: true;
	sourceEvents: CalEvent[];
	sourceCalendarIds: string[];
};

export function isMerged(e: CalEvent): e is MergedEvent {
	return 'merged' in e && (e as any).merged === true;
}
