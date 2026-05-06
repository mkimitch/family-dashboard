export type CountdownVariant = 'default' | 'subtle' | 'accent';

export type CountdownItem = {
	id: string;
	label: string;
	targetDate: string;
	enabled?: boolean;
	sortOrder?: number;
	showWhenExpired?: boolean;
	startsAt?: string;
	endsAt?: string;
	variant?: CountdownVariant;
};

export const MAX_VISIBLE_COUNTDOWNS = 3;

const countdowns: CountdownItem[] = [
	// {
	// 	id: 'last-day-of-school',
	// 	label: 'Last day of school',
	// 	targetDate: '2026-06-05',
	// 	variant: 'subtle'
	// },
	// {
	// 	id: 'summer-vacation',
	// 	label: 'Summer vacation starts',
	// 	targetDate: '2026-06-12T15:00:00-05:00',
	// 	variant: 'accent'
	// },
	// {
	// 	id: 'school-book-fair',
	// 	label: 'Book fair',
	// 	targetDate: '2026-10-14',
	// 	startsAt: '2026-10-01',
	// 	endsAt: '2026-10-15'
	// }
];

export default countdowns;
