const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

// Explicit-offset instants remain correct across DST and regardless of the kiosk's zone.
const instant = (value: unknown): Date | null => {
	const milliseconds =
		typeof value === 'number'
			? value * (Math.abs(value) < 1e12 ? 1000 : 1)
			: typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
				? Date.parse(value)
				: NaN;
	return Number.isFinite(milliseconds) ? new Date(milliseconds) : null;
};

/** Missing, invalid, or out-of-date solar data defaults to daytime illumination. */
export const isWeatherNight = (weather: unknown, now: Date): boolean => {
	const root = record(record(weather).data ?? weather);
	try {
		const timeZone = typeof root.timezone === 'string' ? root.timezone : undefined;
		const dayFormatter = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		const clockFormatter = new Intl.DateTimeFormat('en-GB', {
			timeZone,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		});
		const today = dayFormatter.format(now);
		const seconds = (value: string): number | null => {
			const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
			if (!match) return null;
			let hour = Number(match[1]);
			const minute = Number(match[2]);
			const second = Number(match[3] ?? 0);
			if (minute > 59 || second > 59 || hour > (match[4] ? 12 : 23) || (match[4] && hour < 1))
				return null;
			if (match[4]) hour = (hour % 12) + (match[4].toLowerCase() === 'pm' ? 12 : 0);
			return hour * 3600 + minute * 60 + second;
		};
		const solarSeconds = (value: unknown): number | null => {
			const date = instant(value);
			if (date)
				return dayFormatter.format(date) === today ? seconds(clockFormatter.format(date)) : null;
			return typeof value === 'string' ? seconds(value) : null;
		};
		const daily = root.daily ?? root.forecast ?? root.days;
		const forecast = Array.isArray(daily)
			? daily.map(record).find((day) => day.date === today)
			: undefined;
		const astro = record(root.astronomy ?? root.astro);
		// Forecast solar times cover midnight even before the next weather poll completes.
		const observed = instant(root.updatedAt ?? root.generatedAt);
		const candidates = [
			forecast,
			...(!observed || dayFormatter.format(observed) === today ? [astro, root] : [])
		];
		for (const candidate of candidates) {
			if (!candidate) continue;
			const sunrise = solarSeconds(candidate.sunrise);
			const sunset = solarSeconds(candidate.sunset);
			if (sunrise === null || sunset === null || sunrise >= sunset) continue;
			const current = seconds(clockFormatter.format(now));
			return current !== null && (current < sunrise || current >= sunset);
		}
	} catch {
		// Invalid timezone or timestamp: do not guess at local solar times.
	}
	return false;
};
