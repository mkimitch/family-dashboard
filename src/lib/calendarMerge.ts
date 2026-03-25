import type { CalEvent, CalInfo, MergedEvent } from '$lib/config/types';

// ── Feature flag ────────────────────────────────────────────────────────
export const MERGE_ALLDAY_DUPLICATES = true;

// ── Skip-prefix patterns (MVP: exclude from merge candidacy) ────────────
const SKIP_PREFIXES_RE = /^(cancelled\s*:|updated\s*:|\[tentative\])/i;

export function hasSkipPrefix(title: string): boolean {
	return SKIP_PREFIXES_RE.test(title.trim());
}

// ── Title normalization (comparison only, never displayed) ──────────────
const EMOJI_EDGE_RE =
	/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+|[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/gu;

export function normalizeTitle(title: string): string {
	let t = title.trim();
	t = t.replace(/\s+/g, ' ');
	t = t.toLowerCase();
	t = t.replace(EMOJI_EDGE_RE, '').trim();
	t = t.normalize('NFC');
	return t;
}

// ── Date-span normalization (inclusive YYYY-MM-DD pair) ──────────────────
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function subtractOneDay(ymd: string): string {
	const [y, m, d] = ymd.split('-').map(Number);
	const dt = new Date(y, m - 1, d);
	dt.setDate(dt.getDate() - 1);
	const ny = dt.getFullYear();
	const nm = String(dt.getMonth() + 1).padStart(2, '0');
	const nd = String(dt.getDate()).padStart(2, '0');
	return `${ny}-${nm}-${nd}`;
}

function formatYMD(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function isMidnight(d: Date): boolean {
	return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

export function computeEffectiveSpan(e: CalEvent): {
	effectiveStartYMD: string;
	effectiveEndYMD: string;
} {
	const startDate = e.start instanceof Date ? e.start : new Date(e.start as any);
	const effectiveStartYMD = e.rawStartYMD ?? formatYMD(startDate);

	// End-date normalization (exclusive → inclusive)
	if (e.rawEndYMD) {
		if (e.rawEndYMD !== effectiveStartYMD) {
			return { effectiveStartYMD, effectiveEndYMD: subtractOneDay(e.rawEndYMD) };
		}
		return { effectiveStartYMD, effectiveEndYMD: effectiveStartYMD };
	}

	if (e.end) {
		const endDate = e.end instanceof Date ? e.end : new Date(e.end as any);
		const startD = e.start instanceof Date ? e.start : new Date(e.start as any);
		if (isMidnight(startD) && isMidnight(endDate) && formatYMD(startD) !== formatYMD(endDate)) {
			const tmp = new Date(endDate);
			tmp.setDate(tmp.getDate() - 1);
			return { effectiveStartYMD, effectiveEndYMD: formatYMD(tmp) };
		}
	}

	return { effectiveStartYMD, effectiveEndYMD: effectiveStartYMD };
}

// ── Primary calendar selection ──────────────────────────────────────────
function sortCalendarIds(ids: string[], calendars: Map<string, CalInfo>): string[] {
	return [...ids].sort((a, b) => {
		const ca = calendars.get(a);
		const cb = calendars.get(b);
		const oa = ca?.sortOrder ?? Number.POSITIVE_INFINITY;
		const ob = cb?.sortOrder ?? Number.POSITIVE_INFINITY;
		if (oa !== ob) return oa - ob;
		const na = ca?.name || a;
		const nb = cb?.name || b;
		return na.localeCompare(nb, undefined, { sensitivity: 'base' });
	});
}

// ── Main merge function ─────────────────────────────────────────────────
export function mergeAllDayDuplicates(
	events: CalEvent[],
	calendars: Map<string, CalInfo>
): CalEvent[] {
	if (!MERGE_ALLDAY_DUPLICATES) return [...events];

	const result: CalEvent[] = [];
	// Map from mergeKey → array of candidate events
	const mergeGroups = new Map<string, CalEvent[]>();
	// Track which events are all-day merge candidates (index → mergeKey)
	const candidateKeys = new Map<number, string>();

	for (let i = 0; i < events.length; i++) {
		const e = events[i];

		// Only all-day events are merge candidates
		if (!e.allDay) continue;

		// Skip events with blank titles
		const title = (e.title ?? '').trim();
		if (!title) continue;

		// Skip cancelled/updated/tentative events from merge candidacy
		if (hasSkipPrefix(title)) continue;

		const normalized = normalizeTitle(title);
		if (!normalized) continue;

		const { effectiveStartYMD, effectiveEndYMD } = computeEffectiveSpan(e);
		const key = `${normalized}|${effectiveStartYMD}|${effectiveEndYMD}`;

		candidateKeys.set(i, key);
		if (!mergeGroups.has(key)) mergeGroups.set(key, []);
		mergeGroups.get(key)!.push(e);
	}

	// Build set of events that were consumed into a merge
	const consumed = new Set<CalEvent>();
	// Track which mergeKeys have already been emitted
	const emittedKeys = new Set<string>();

	for (let i = 0; i < events.length; i++) {
		const e = events[i];

		if (consumed.has(e)) continue;

		const key = candidateKeys.get(i);
		if (key && !emittedKeys.has(key)) {
			const group = mergeGroups.get(key)!;

			// Collect distinct calendar IDs
			const calIdSet = new Set<string>();
			for (const ge of group) {
				if (ge.calendarId) calIdSet.add(ge.calendarId);
			}

			if (calIdSet.size >= 2) {
				// Merge: multiple calendars with same key
				const sortedCalIds = sortCalendarIds([...calIdSet], calendars);
				const primaryCalId = sortedCalIds[0];
				const primary = group.find((ge) => ge.calendarId === primaryCalId) ?? group[0];

				const merged: MergedEvent = {
					...primary,
					calendarId: primaryCalId,
					merged: true,
					sourceEvents: [...group],
					sourceCalendarIds: sortedCalIds
				};

				result.push(merged);
				for (const ge of group) consumed.add(ge);
				emittedKeys.add(key);
				continue;
			}
		}

		// Non-candidate or single-calendar group: pass through
		result.push(e);
		if (key) emittedKeys.add(key);
	}

	return result;
}
