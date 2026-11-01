export type CalendarDecoration = 'halloween' | 'diwali';
export type DiwaliIntensity = 'subtle' | 'full' | 'moderate';

export type DiwaliFestival = {
	// Inclusive, zero-padded local civil dates. Each entry explicitly includes its year.
	startDate: string;
	mainDate: string;
	endDate: string;
};

export const diwaliFestivals: readonly DiwaliFestival[] = [
	// Shared calendar's Deepavali entry: Nov 6–11 exclusive. Main day: Nov 8.
	{ startDate: '2026-11-06', mainDate: '2026-11-08', endDate: '2026-11-10' }
];

export const getDiwaliIntensity = (
	date: Date,
	festivals: readonly DiwaliFestival[] = diwaliFestivals
): DiwaliIntensity | null => {
	if (!Number.isFinite(date.getTime())) return null;
	const civilDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	const festival = festivals.find(
		({ startDate, endDate }) => startDate <= civilDate && civilDate <= endDate
	);
	if (!festival) return null;
	if (civilDate === festival.mainDate) return 'full';
	return civilDate < festival.mainDate ? 'subtle' : 'moderate';
};

const calendarDecorations: ReadonlyArray<{
	year?: number;
	month: number;
	day: number;
	decoration: CalendarDecoration;
}> = [{ month: 10, day: 31, decoration: 'halloween' }];

// Calendar columns are local civil dates, also used for their day/month headings.
// Do not convert them to UTC (or reinterpret them in the feed's timezone).
export const getCalendarDecoration = (date: Date): CalendarDecoration | null =>
	calendarDecorations.find(
		({ year, month, day }) =>
			(year === undefined || year === date.getFullYear()) &&
			month === date.getMonth() + 1 &&
			day === date.getDate()
	)?.decoration ?? (getDiwaliIntensity(date) ? 'diwali' : null);

export const parseCalendarPreviewDate = (value: string | null): Date | null => {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
		? date
		: null;
};
