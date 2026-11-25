import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { error } from '@sveltejs/kit';
import { presentWeatherCondition, type WeatherContext } from '$lib/weatherPresentation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (import.meta.env.DEV) {
		const { default: fixture } = await import('$lib/server/fixtures/weather-contract-v1.json');
		return {
			...fixture,
			rows: fixture.rows.map((row) => {
				const context = row.context as WeatherContext;
				const presentation = presentWeatherCondition(
					{ conditions: { [context]: row } },
					fixture.conditionSchemaVersion,
					context
				);
				return {
					...row,
					presentation,
					assetExists: existsSync(resolve('static', '.' + presentation.path))
				};
			})
		};
	}
	error(404);
};
