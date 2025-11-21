import type { CountdownConfig, ScheduleRule } from '$lib/config/types';
import { readCountdowns, writeCountdowns } from '$lib/server/configStore';
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
	const countdowns = await readCountdowns();
	return { countdowns };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const intent = String(data.get('intent') ?? '').trim();
		const idRaw = String(data.get('id') ?? '').trim();
		let list = await readCountdowns();

		if (intent === 'delete') {
			if (!idRaw) return { ok: true };
			list = list.filter((c) => c.id !== idRaw);
			await writeCountdowns(list);
			return { ok: true };
		}

		if (intent === 'save') {
			const label = String(data.get('label') ?? '').trim();
			const targetDateTime = String(data.get('targetDateTime') ?? '').trim();
			const description = String(data.get('description') ?? '').trim();
			const priorityRaw = String(data.get('priority') ?? '').trim();
			const enabledRaw = String(data.get('enabled') ?? '').trim();
			const priorityNum = Number(priorityRaw);
			const priority = Number.isFinite(priorityNum) ? priorityNum : 0;
			const enabled = enabledRaw === 'on' || enabledRaw === '1';
			const schedules = parseScheduleFromForm(data);
			let c: CountdownConfig | undefined = list.find((x) => x.id === idRaw);
			if (!c) {
				const id = idRaw || makeId('cd');
				c = {
					id,
					label,
					targetDateTime,
					description,
					priority,
					enabled,
					schedules
				};
				list.push(c);
			} else {
				c.label = label;
				c.targetDateTime = targetDateTime;
				c.description = description || undefined;
				c.priority = priority;
				c.enabled = enabled;
				c.schedules = schedules;
			}
			await writeCountdowns(list);
			return { ok: true };
		}

		return { ok: false };
	}
};
