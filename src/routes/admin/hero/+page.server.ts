import type { HeroMessageConfig, ScheduleRule } from '$lib/config/types';
import { readHeroMessages, writeHeroMessages } from '$lib/server/configStore';
import type { Actions, PageServerLoad } from './$types';

function makeId(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseScheduleFromForm(data: FormData): ScheduleRule[] {
	const startDateRaw = String(data.get('schedule_startDate') ?? '').trim();
	const endDateRaw = String(data.get('schedule_endDate') ?? '').trim();
	const startTimeRaw = String(data.get('schedule_startTime') ?? '').trim();
	const endTimeRaw = String(data.get('schedule_endTime') ?? '').trim();
	const daysRaw = data.getAll('schedule_days') ?? [];
	const daysOfWeek = daysRaw
		.map((v) => Number(v))
		.filter((n) => Number.isFinite(n) && n >= 0 && n <= 6);
	const hasAnyDate = startDateRaw !== '' || endDateRaw !== '';
	const hasAnyTime = startTimeRaw !== '' || endTimeRaw !== '';
	const hasAnyDay = daysOfWeek.length > 0;
	if (!hasAnyDate && !hasAnyTime && !hasAnyDay) return [];
	const existingId = String(data.get('schedule_id') ?? '').trim();
	const rule: ScheduleRule = {
		id: existingId || makeId('sch'),
		startDate: startDateRaw || undefined,
		endDate: endDateRaw || undefined,
		startTime: startTimeRaw || undefined,
		endTime: endTimeRaw || undefined,
		daysOfWeek: daysOfWeek.length ? daysOfWeek : undefined
	};
	return [rule];
}

export const load: PageServerLoad = async () => {
	const heroes = await readHeroMessages();
	return { heroes };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const intent = String(data.get('intent') ?? '').trim();
		const idRaw = String(data.get('id') ?? '').trim();
		let list = await readHeroMessages();

		if (intent === 'delete') {
			if (!idRaw) return { ok: true };
			list = list.filter((h) => h.id !== idRaw);
			await writeHeroMessages(list);
			return { ok: true };
		}

		if (intent === 'save') {
			const title = String(data.get('title') ?? '').trim();
			const subtitle = String(data.get('subtitle') ?? '').trim();
			const alertsRaw = String(data.get('alerts') ?? '').trim();
			const wallpaperModeRaw = String(data.get('wallpaperMode') ?? 'default').trim();
			const wallpaperPhotosRaw = String(data.get('wallpaperPhotos') ?? '').trim();
			const priorityRaw = String(data.get('priority') ?? '').trim();
			const enabledRaw = String(data.get('enabled') ?? '').trim();
			const alerts = alertsRaw
				.split(/\r?\n/)
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			const wallpaperPhotos = wallpaperPhotosRaw
				.split(/\r?\n/)
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			const priorityNum = Number(priorityRaw);
			const priority = Number.isFinite(priorityNum) ? priorityNum : 0;
			const enabled = enabledRaw === 'on' || enabledRaw === '1';
			const schedules = parseScheduleFromForm(data);
			let hero: HeroMessageConfig | undefined = list.find((h) => h.id === idRaw);
			if (!hero) {
				const id = idRaw || makeId('hero');
				hero = {
					id,
					title,
					subtitle,
					alerts,
					wallpaperMode: wallpaperModeRaw === 'override' ? 'override' : 'default',
					wallpaperPhotos,
					priority,
					enabled,
					schedules
				};
				list.push(hero);
			} else {
				hero.title = title;
				hero.subtitle = subtitle || undefined;
				hero.alerts = alerts;
				hero.wallpaperMode = wallpaperModeRaw === 'override' ? 'override' : 'default';
				hero.wallpaperPhotos = wallpaperPhotos;
				hero.priority = priority;
				hero.enabled = enabled;
				hero.schedules = schedules;
			}
			await writeHeroMessages(list);
			return { ok: true };
		}

		return { ok: false };
	}
};
