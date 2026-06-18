import type { CountdownItem } from '$lib/config/countdowns';
import { listHeroCountdownItems } from '$lib/server/countdowns/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let countdowns: CountdownItem[] = [];

	try {
		countdowns = await listHeroCountdownItems();
	} catch (error) {
		// Degrade gracefully: a countdown DB problem (unmigrated/missing/locked)
		// must not take down the whole dashboard, mirroring +layout.server.ts.
		console.error('Countdown hero load failed; rendering without countdowns:', error);
	}

	return { countdowns };
};
