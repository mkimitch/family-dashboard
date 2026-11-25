type ProbabilityInput = { pop?: unknown; popBasis?: unknown; precipPct?: unknown };

export function formatWeatherProbability(input: ProbabilityInput, legacy = false) {
	let value = input.pop;
	if (legacy && !Object.hasOwn(input, 'pop') && typeof input.precipPct === 'number') {
		value = input.precipPct / 100;
	}
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
		return { label: '—', description: 'Precipitation probability unavailable', showLegend: true };
	}

	const percent = `${Math.round(value * 100)}%`;
	switch (input.popBasis) {
		case 'daily':
			return {
				label: percent,
				description: `${percent} daily probability of precipitation`,
				showLegend: false
			};
		case 'precipitationProbabilityAvg':
			return {
				label: `Avg ${percent}`,
				description: `${percent} average interval precipitation probability`,
				showLegend: true
			};
		case 'precipitationProbabilityMax':
			return {
				label: `Max ${percent}`,
				description: `${percent} maximum interval precipitation probability`,
				showLegend: true
			};
		default:
			return {
				label: `${percent}?`,
				description: `${percent} precipitation probability, basis unknown`,
				showLegend: true
			};
	}
}
