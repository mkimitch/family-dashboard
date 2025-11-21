import { isScheduleRuleActive } from '$lib/config/schedule';
import type { CountdownConfig, HeroMessageConfig } from '$lib/config/types';
import { readCountdowns, readHeroMessages } from '$lib/server/configStore';
import type { LayoutServerLoad } from './$types';

function selectActiveHero(list: HeroMessageConfig[], now: Date): HeroMessageConfig | null {
	const active = list.filter((h) => {
		if (h.enabled === false) return false;
		if (Array.isArray(h.schedules) && h.schedules.length) {
			return h.schedules.some((r) => isScheduleRuleActive(r, now));
		}
		return true;
	});
	if (!active.length) return null;
	active.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
	return active[0];
}

function selectActiveCountdowns(list: CountdownConfig[], now: Date): {
	label: string;
	value: string | number;
}[] {
	const result: { label: string; value: string | number }[] = [];
	for (const c of list) {
		if (c.enabled === false) continue;
		if (Array.isArray(c.schedules) && c.schedules.length) {
			const anyActive = c.schedules.some((r) => isScheduleRuleActive(r, now));
			if (!anyActive) continue;
		}
		let target: Date | null = null;
		try {
			const n = Date.parse(c.targetDateTime);
			if (Number.isFinite(n)) target = new Date(n);
		} catch {
			// ignore parsing errors
		}
		if (!target) continue;
		const diffMs = target.getTime() - now.getTime();
		if (diffMs <= 0) continue;
		const diffMinutes = Math.round(diffMs / (60 * 1000));
		const diffHours = Math.round(diffMinutes / 60);
		const diffDays = Math.round(diffMinutes / (60 * 24));
		let value: string;
		if (diffDays >= 2) {
			value = `${diffDays} days`;
		} else if (diffHours >= 2) {
			value = `${diffHours} hours`;
		} else {
			value = `${Math.max(1, diffMinutes)} minutes`;
		}
		result.push({ label: c.label, value });
	}
	result.sort((a, b) => a.label.localeCompare(b.label));
	return result;
}

export const load: LayoutServerLoad = async ({ fetch }) => {
	const [weatherRes, photosRes, heroList, countdownList] = await Promise.all([
		fetch('/api/weather', { cache: 'no-store' }),
		fetch('/api/photos', { cache: 'no-store' }),
		readHeroMessages(),
		readCountdowns()
	]);

	let weather: unknown = null;
	if (weatherRes.ok && weatherRes.status !== 204) {
		try {
			const raw = await weatherRes.json();
			// API returns either { data: ... } or the root object directly
			weather = (raw as any)?.data ?? raw;
		} catch {
			weather = null;
		}
	}

	let photos: string[] = [];
	if (photosRes.ok) {
		try {
			const data = (await photosRes.json()) as { files?: string[] } | null;
			if (data && Array.isArray(data.files)) photos = data.files;
		} catch {
			photos = [];
		}
	}

	const now = new Date();
	const hero = selectActiveHero(Array.isArray(heroList) ? heroList : [], now);
	const countdowns = selectActiveCountdowns(Array.isArray(countdownList) ? countdownList : [], now);
	const wallpaperOverride =
		hero && hero.wallpaperMode === 'override' && Array.isArray(hero.wallpaperPhotos)
			? hero.wallpaperPhotos
			: undefined;

	return {
		weather,
		photos,
		hero: hero
			? {
				alerts: Array.isArray(hero.alerts) ? hero.alerts : [],
				messageTitle: hero.title,
				messageSubtitle: hero.subtitle ?? ''
			}
			: null,
		countdowns,
		wallpaperOverride
	};
};
