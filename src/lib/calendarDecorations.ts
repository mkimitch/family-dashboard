export type CalendarDecoration = 'halloween';

const annualDecorations: ReadonlyArray<{
	month: number;
	day: number;
	decoration: CalendarDecoration;
}> = [{ month: 10, day: 31, decoration: 'halloween' }];

// Calendar columns are local civil dates, also used for their day/month headings.
// Do not convert them to UTC (or reinterpret them in the feed's timezone).
export const getCalendarDecoration = (date: Date): CalendarDecoration | null =>
	annualDecorations.find(
		({ month, day }) => month === date.getMonth() + 1 && day === date.getDate()
	)?.decoration ?? null;

export const parseCalendarPreviewDate = (value: string | null): Date | null => {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
		? date
		: null;
};
