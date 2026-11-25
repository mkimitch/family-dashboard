type ForecastRow = { date?: string | number };

function localWeatherDate(
	days: ForecastRow[],
	timeZone: string | null | undefined,
	now: Date
): string | undefined {
	if (
		!timeZone ||
		days.some((day) => typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date))
	) {
		return undefined;
	}
	try {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).formatToParts(now);
		return ['year', 'month', 'day']
			.map((key) => parts.find((part) => part.type === key)?.value)
			.join('-');
	} catch {
		// Older deployments may omit or provide an unsupported zone.
		return undefined;
	}
}

export function currentForecastDay<T extends ForecastRow>(
	days: T[],
	timeZone: string | null | undefined,
	now: Date
): T | undefined {
	const today = localWeatherDate(days, timeZone, now);
	return today ? days.find((day) => day.date === today) : days[0];
}

/** Use the provider's date label so an omitted current day does not hide tomorrow. */
export function futureForecastDays<T extends ForecastRow>(
	days: T[],
	timeZone: string | null | undefined,
	now: Date
): T[] {
	const today = localWeatherDate(days, timeZone, now);
	return today
		? days.filter((day) => typeof day.date === 'string' && day.date > today).slice(0, 7)
		: days.slice(1, 8);
}
