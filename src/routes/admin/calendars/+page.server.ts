import type { CalendarConfig, CalendarOverlayEvent } from '$lib/config/types';
import { readCalendarConfigs, readCalendarOverlays, writeCalendarConfigs, writeCalendarOverlays } from '$lib/server/configStore';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [remoteRes, configs, overlays] = await Promise.all([
		fetch('/api/calendars', { cache: 'no-store' }),
		readCalendarConfigs(),
		readCalendarOverlays()
	]);

	let remote: unknown[] = [];
	if (remoteRes.ok) {
		try {
			const data = await remoteRes.json();
			if (Array.isArray(data)) remote = data as unknown[];
		} catch {
			remote = [];
		}
	}

	return {
		remoteCalendars: remote,
		configs,
		overlays
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const intent = String(data.get('intent') ?? '').trim();

		if (intent === 'saveConfig') {
			const id = String(data.get('id') ?? '').trim();
			if (!id) return { ok: false };
			const name = String(data.get('name') ?? '').trim();
			const color = String(data.get('color') ?? '').trim();
			const icon = String(data.get('icon') ?? '').trim();
			const sortOrderRaw = String(data.get('sortOrder') ?? '').trim();
			const enabledRaw = String(data.get('enabled') ?? '').trim();
			const sortOrderNum = Number(sortOrderRaw);
			const enabled = enabledRaw === 'on' || enabledRaw === '1';
			let list = await readCalendarConfigs();
			let cfg: CalendarConfig | undefined = list.find((c) => c.id === id);
			if (!cfg) {
				cfg = { id, enabled };
				list.push(cfg);
			}
			cfg.name = name || undefined;
			cfg.color = color || undefined;
			cfg.icon = icon || undefined;
			cfg.enabled = enabled;
			cfg.sortOrder = Number.isFinite(sortOrderNum) ? sortOrderNum : undefined;
			await writeCalendarConfigs(list);
			return { ok: true };
		}

		if (intent === 'deleteConfig') {
			const id = String(data.get('id') ?? '').trim();
			if (!id) return { ok: true };
			const list = await readCalendarConfigs();
			const next = list.filter((c) => c.id !== id);
			await writeCalendarConfigs(next);
			return { ok: true };
		}

		if (intent === 'saveOverlay') {
			const idRaw = String(data.get('id') ?? '').trim();
			const title = String(data.get('title') ?? '').trim();
			const startDate = String(data.get('startDate') ?? '').trim();
			const endDateRaw = String(data.get('endDate') ?? '').trim();
			const calendarId = String(data.get('calendarId') ?? '').trim();
			const allDayRaw = String(data.get('allDay') ?? '').trim();
			const allDay = allDayRaw === 'on' || allDayRaw === '1' || allDayRaw === '';
			if (!title || !startDate) return { ok: false };
			let list = await readCalendarOverlays();
			let ev: CalendarOverlayEvent | undefined = list.find((e) => e.id === idRaw);
			if (!ev) {
				const id = idRaw || `ov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
				ev = { id, title, startDate };
				list.push(ev);
			}
			ev.title = title;
			ev.startDate = startDate;
			ev.endDate = endDateRaw || undefined;
			ev.calendarId = calendarId || undefined;
			ev.allDay = allDay;
			await writeCalendarOverlays(list);
			return { ok: true };
		}

		if (intent === 'deleteOverlay') {
			const id = String(data.get('id') ?? '').trim();
			if (!id) return { ok: true };
			const list = await readCalendarOverlays();
			const next = list.filter((e) => e.id !== id);
			await writeCalendarOverlays(next);
			return { ok: true };
		}

		return { ok: false };
	}
};
