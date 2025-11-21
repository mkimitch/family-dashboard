import type { ScheduleRule } from './types';

function ymdOf(d: Date): string {
	const y = d.getFullYear();
	const m = d.getMonth() + 1;
	const day = d.getDate();
	const mm = m < 10 ? `0${m}` : String(m);
	const dd = day < 10 ? `0${day}` : String(day);
	return `${y}-${mm}-${dd}`;
}

function parseTimeToMinutes(v: string | undefined | null): number | null {
	if (!v) return null;
	const parts = v.split(':');
	if (parts.length < 2) return null;
	const h = Number(parts[0]);
	const m = Number(parts[1]);
	if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
	return h * 60 + m;
}

export function isScheduleRuleActive(rule: ScheduleRule, now: Date): boolean {
	const today = ymdOf(now);
	if (rule.startDate && today < rule.startDate) return false;
	if (rule.endDate && today > rule.endDate) return false;

	if (rule.daysOfWeek && rule.daysOfWeek.length) {
		const dow = now.getDay();
		if (!rule.daysOfWeek.includes(dow)) return false;
	}

	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	const startMinutes = parseTimeToMinutes(rule.startTime);
	const endMinutes = parseTimeToMinutes(rule.endTime);
	if (startMinutes !== null && nowMinutes < startMinutes) return false;
	if (endMinutes !== null && nowMinutes >= endMinutes) return false;

	return true;
}
