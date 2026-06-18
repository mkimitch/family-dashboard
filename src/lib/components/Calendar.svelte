<script lang="ts">
	import { MERGE_ALLDAY_DUPLICATES, mergeAllDayDuplicates } from '$lib/calendarMerge';
	import { type ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
	import type {
		CalendarConfig,
		CalendarOverlayEvent,
		CalEvent,
		CalInfo,
		DashboardTask,
		MergedEvent
	} from '$lib/config/types';
	import { isMerged } from '$lib/config/types';
	import {
		createDateTimeFormatter,
		getResolvedDateTimeDisplaySettings
	} from '$lib/utils/dateTimeContext';
	import { normalizeOmniCalTasks } from '$lib/utils/tasks';
	import { onMount } from 'svelte';
	import LastUpdated from './LastUpdated.svelte';

	type ApiEvent = any;
	type MergedTileMode = 'svg' | 'url' | 'text' | 'color';
	type MergedIconTile = {
		key: string;
		calendarId: string;
		name: string;
		color: string;
		mode: MergedTileMode;
		style: string;
		html?: string;
		src?: string;
		text?: string;
	};
	type MergedIconModel = {
		className: string;
		totalCount: number;
		badge: string | null;
		tiles: MergedIconTile[];
	};
	type AllDayEventItem = {
		kind: 'event';
		e: CalEvent;
		isStart: boolean;
		isEnd: boolean;
		sortStart: number;
		sortEnd: number;
		sourceIndex: number;
	};
	type AllDayTaskItem = {
		kind: 'task';
		task: DashboardTask;
		sourceIndex: number;
	};
	type AllDayItem = AllDayEventItem | AllDayTaskItem;

	let calendars = $state(new Map<string, CalInfo>());
	let rawEvents = $state<CalEvent[]>([]);
	let tasks = $state<DashboardTask[]>([]);
	let displayEvents = $derived<CalEvent[]>(
		MERGE_ALLDAY_DUPLICATES ? mergeAllDayDuplicates(rawEvents, calendars) : [...rawEvents]
	);
	let visibleDays = $state<Date[]>([]);
	let allDayItemsByDay = $state<Record<string, AllDayItem[]>>({});
	let now = $state(new Date());
	let timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;
	let tick: number | undefined;
	let updatedAt = $state<string | null>(null);
	const EVENTS_POLL_MINUTES = 5;
	const EVENTS_POLL_MS = EVENTS_POLL_MINUTES * 60 * 1000;
	let lastEventsReloadAt = 0;
	let { class: className = '', dateTimeDisplay = null as ResolvedDateTimeDisplaySettings | null } =
		$props();
	const dateTime = createDateTimeFormatter(() =>
		getResolvedDateTimeDisplaySettings({ dateTimeDisplay })
	);
	const createKeyFormatter = (zone?: string) =>
		new Intl.DateTimeFormat('en-CA', {
			timeZone: zone || undefined,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});

	let keyFormatter = createKeyFormatter(timeZone);
	let lastDayKey = '';
	$effect(() => {
		keyFormatter = createKeyFormatter(timeZone);
		lastDayKey = keyFormatter.format(now);
	});

	const keyOf = (d: Date) => keyFormatter.format(d);
	const sameDay = (a: Date, b: Date) => keyOf(a) === keyOf(b);

	const startOfWeek = (d: Date): Date => {
		const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		const dow = r.getDay();
		r.setDate(r.getDate() - dow);
		return r;
	};
	const addDays = (d: Date, n: number): Date => {
		const r = new Date(d);
		r.setDate(r.getDate() + n);
		return r;
	};
	const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
	const parseCalDate = (v: any): Date => {
		if (v instanceof Date) return v;
		if (typeof v === 'string') {
			const m = v.match(DATE_ONLY_RE);
			if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
		}
		const n = typeof v === 'number' ? v : Date.parse(v);
		return Number.isFinite(n) ? new Date(n) : new Date();
	};
	const extractDateInfo = (v: any): { ymd: string | null; dt: Date | null } => {
		if (v instanceof Date) return { ymd: null, dt: v };
		if (typeof v === 'string') {
			if (DATE_ONLY_RE.test(v)) {
				const y = Number(v.slice(0, 4));
				const m = Number(v.slice(5, 7));
				const d = Number(v.slice(8, 10));
				return { ymd: v.slice(0, 10), dt: new Date(y, m - 1, d) };
			}
			const n = Date.parse(v);
			return Number.isFinite(n) ? { ymd: null, dt: new Date(n) } : { ymd: null, dt: null };
		}
		if (v && typeof v === 'object') {
			const d = (v as any).date;
			if (typeof d === 'string' && DATE_ONLY_RE.test(d)) {
				const y = Number(d.slice(0, 4));
				const m = Number(d.slice(5, 7));
				const dd = Number(d.slice(8, 10));
				return { ymd: d.slice(0, 10), dt: new Date(y, m - 1, dd) };
			}
			const dt = (v as any).dateTime;
			if (typeof dt === 'string') {
				const n = Date.parse(dt);
				return Number.isFinite(n) ? { ymd: null, dt: new Date(n) } : { ymd: null, dt: null };
			}
		}
		return { ymd: null, dt: null };
	};
	const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const isMidnightInZone = (d: Date, zone: string | undefined): boolean => {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			hour12: false
		}).formatToParts(d);

		const val = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);

		return val('hour') === 0 && val('minute') === 0 && val('second') === 0;
	};
	let ICON_SEQ = 0;
	const iconIsSvg = (s?: string) => typeof s === 'string' && s.includes('<svg');
	const iconIsUrl = (s?: string) =>
		typeof s === 'string' &&
		(/^data:image\/svg\+xml/i.test(s) ||
			/^https?:\/\//.test(s) ||
			s.startsWith('/') ||
			/\.svg(\?|$)/i.test(s));
	const iconSrc = (s?: string) => (typeof s === 'string' ? s : '');
	const namespaceSvgIds = (svg: string): string => {
		try {
			if (typeof window === 'undefined' || typeof (window as any).DOMParser === 'undefined')
				return svg;
			const uid = `ico${++ICON_SEQ}`;
			const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
			const root = doc.documentElement;
			if (!root) return svg;
			const map: Record<string, string> = {};
			root.querySelectorAll('[id]').forEach((el) => {
				const oldId = el.getAttribute('id');
				if (!oldId) return;
				const neu = `${oldId}-${uid}`;
				el.setAttribute('id', neu);
				map[oldId] = neu;
			});
			const updateAttrValue = (el: Element, name: string) => {
				const val = el.getAttribute(name);
				if (!val) return;
				let next = val;
				for (const oldId in map) {
					const neu = map[oldId];
					next = next.replaceAll(`url(#${oldId})`, `url(#${neu})`);
					if (name === 'href' || name === 'xlink:href') {
						next = next.replaceAll(`#${oldId}`, `#${neu}`);
					}
				}
				if (next !== val) el.setAttribute(name, next);
			};
			root.querySelectorAll('*').forEach((el) => {
				Array.from(el.attributes).forEach((a) => updateAttrValue(el, a.name));
				if ((el as Element).tagName && (el as Element).tagName.toLowerCase() === 'style') {
					let css = el.textContent || '';
					for (const oldId in map) {
						const neu = map[oldId];
						css = css.replaceAll(`url(#${oldId})`, `url(#${neu})`);
					}
					el.textContent = css;
				}
				['aria-labelledby', 'aria-describedby'].forEach((name) => {
					const v = el.getAttribute(name);
					if (!v) return;
					const next = v
						.split(/\s+/)
						.map((id) => map[id] || id)
						.join(' ');
					if (next !== v) el.setAttribute(name, next);
				});
			});
			return new XMLSerializer().serializeToString(root);
		} catch {
			return svg;
		}
	};
	const iconHtml = (s?: string) => (iconIsSvg(s) ? namespaceSvgIds(String(s).trim()) : '');

	const looksLikeUrl = (s?: string) => typeof s === 'string' && /^(https?:)?\/\//i.test(s);
	const looksLikeEmail = (s?: string) => typeof s === 'string' && /@/.test(s || '');
	const displayCalName = (c?: CalInfo): string => {
		const raw = (c?.name || c?.id || '').trim();
		if (!raw) return '';
		if (looksLikeUrl(raw)) {
			try {
				const u = new URL(raw, 'http://x');
				return u.hostname.replace(/^www\./, '');
			} catch {
				return raw.replace(/^https?:\/\//i, '');
			}
		}
		if (looksLikeEmail(raw)) return raw.split('@')[0];
		return raw;
	};
	const MERGED_TILE_LAYOUTS: Record<
		2 | 3 | 4,
		Array<{ left: number; top: number; width: number; height: number }>
	> = {
		2: [
			{ left: 0, top: 0, width: 50, height: 100 },
			{ left: 50, top: 0, width: 50, height: 100 }
		],
		3: [
			{ left: 0, top: 0, width: 50, height: 100 },
			{ left: 50, top: 0, width: 50, height: 50 },
			{ left: 50, top: 50, width: 50, height: 50 }
		],
		4: [
			{ left: 0, top: 0, width: 50, height: 50 },
			{ left: 50, top: 0, width: 50, height: 50 },
			{ left: 0, top: 50, width: 50, height: 50 },
			{ left: 50, top: 50, width: 50, height: 50 }
		]
	};
	const mergedTileStyle = (bounds: {
		left: number;
		top: number;
		width: number;
		height: number;
	}): string =>
		`left:${bounds.left}%;top:${bounds.top}%;width:${bounds.width}%;height:${bounds.height}%;`;
	const mergedCalendarNames = (calendarIds: string[]): string =>
		calendarIds
			.map((cid) => {
				const cal = calendars.get(cid);
				return displayCalName(cal) || cid;
			})
			.join(', ');
	const mergedContextText = (merged: MergedEvent): string => {
		const count = merged.sourceCalendarIds.length;
		const label = count === 1 ? 'calendar' : 'calendars';
		return `Merged across ${count} ${label}: ${mergedCalendarNames(merged.sourceCalendarIds)}`;
	};
	const mergedChipTitle = (title: string, merged: MergedEvent): string =>
		`${title} (${mergedContextText(merged)})`;
	const mergedCountBadge = (count: number): string => (count > 9 ? '9+' : `+${count}`);
	const getMergedIconModel = (merged: MergedEvent): MergedIconModel => {
		const totalCount = merged.sourceCalendarIds.length;
		if (totalCount >= 5) {
			return {
				className: 'merged-icon--aggregate',
				totalCount,
				badge: mergedCountBadge(totalCount),
				tiles: []
			};
		}
		const layout =
			MERGED_TILE_LAYOUTS[Math.max(2, Math.min(totalCount, 4)) as 2 | 3 | 4] ||
			MERGED_TILE_LAYOUTS[4];
		const tiles = merged.sourceCalendarIds.slice(0, layout.length).map((calendarId, index) => {
			const cal = calendars.get(calendarId);
			const icon = typeof cal?.icon === 'string' ? cal.icon.trim() : '';
			const mode: MergedTileMode = iconIsSvg(icon)
				? 'svg'
				: iconIsUrl(icon)
					? 'url'
					: icon
						? 'text'
						: 'color';
			return {
				key: `${calendarId}:${index}`,
				calendarId,
				name: displayCalName(cal) || calendarId,
				color: cal?.color || '#888',
				mode,
				style: mergedTileStyle(layout[index]),
				html: mode === 'svg' ? iconHtml(icon) : undefined,
				src: mode === 'url' ? icon : undefined,
				text: mode === 'text' ? icon : undefined
			} satisfies MergedIconTile;
		});
		return {
			className: `merged-icon--tiles merged-icon--count-${tiles.length}`,
			totalCount,
			badge: null,
			tiles
		};
	};

	const loadCalendars = async () => {
		try {
			const [remoteRes, cfgRes] = await Promise.all([
				fetch('/api/calendars'),
				fetch('/api/calendar-config', { cache: 'no-store' })
			]);
			if (!remoteRes.ok) return;
			const list = await remoteRes.json();
			let overrides: CalendarConfig[] = [];
			if (cfgRes.ok) {
				try {
					const data = await cfgRes.json();
					if (Array.isArray(data)) overrides = data as CalendarConfig[];
				} catch {
					overrides = [];
				}
			}
			const overrideMap = new Map<string, CalendarConfig>();
			for (const cfg of overrides) {
				if (!cfg?.id) continue;
				overrideMap.set(cfg.id, cfg);
			}
			const map = new Map<string, CalInfo>();
			const seen = new Set<string>();
			for (const c of list || []) {
				const id = (c.id ?? c.calendarId ?? c.name ?? c.label ?? '').trim();
				if (!id) continue;
				seen.add(id);
				const cfg = overrideMap.get(id);
				const enabledFromRemote = c?.enabled === undefined || Boolean(c?.enabled);
				const enabled = cfg?.enabled ?? enabledFromRemote;
				if (!enabled) continue;
				const name = cfg?.name ?? c.label ?? c.name ?? id;
				const color = cfg?.color ?? c.color ?? c.calendarColor ?? '#888';
				const icon = cfg?.icon ?? c.icon ?? '';
				const sortRaw = cfg?.sortOrder ?? c.sortOrder ?? c.sort ?? c.order ?? c.position;
				const sortOrder = Number.isFinite(Number(sortRaw)) ? Number(sortRaw) : undefined;
				map.set(id, { id, name, color, icon, sortOrder });
			}
			for (const cfg of overrides) {
				if (!cfg.id || seen.has(cfg.id)) continue;
				if (cfg.enabled === false) continue;
				const id = cfg.id;
				const name = cfg.name ?? id;
				const color = cfg.color ?? '#888';
				const icon = cfg.icon ?? '';
				const sortOrder = cfg.sortOrder;
				map.set(id, { id, name, color, icon, sortOrder });
			}
			calendars = map;
		} catch {}
	};

	const loadEvents = async () => {
		try {
			const start = new Date();
			start.setHours(0, 0, 0, 0);
			const end = addDays(start, 6);
			const startLocal = new Date(
				start.getFullYear(),
				start.getMonth(),
				start.getDate(),
				0,
				0,
				0,
				0
			);
			const endLocalExclusive = new Date(
				end.getFullYear(),
				end.getMonth(),
				end.getDate() + 1,
				0,
				0,
				0,
				0
			);
			const startIso = startLocal.toISOString();
			const endIso = endLocalExclusive.toISOString();
			const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const qs = `/api/calendar?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&clientZone=${encodeURIComponent(tz)}&includeCancelled=true`;
			const [r, overlayRes] = await Promise.all([
				fetch(qs, { cache: 'no-store', headers: { accept: 'application/json' } }),
				fetch('/api/calendar-overlays', { cache: 'no-store' })
			]);
			if (!r.ok) return;
			const data = await r.json();
			const root: any = data && typeof data === 'object' ? data : null;
			let ts: string | null = null;
			if (root) {
				const v =
					root.updatedAt ??
					root.updated_at ??
					root.updateTime ??
					root.last_updated ??
					root.timestamp ??
					null;
				if (typeof v === 'string') ts = v;
			}
			if (!ts) ts = new Date().toISOString();
			updatedAt = ts;
			timeZone = (data && typeof data.zone === 'string' && data.zone) || timeZone;
			buildVisibleDays();
			const arr: ApiEvent[] = Array.isArray(data?.events)
				? data.events
				: Array.isArray(data)
					? data
					: [];
			let listEvents: CalEvent[] = arr.map((e) => {
				const sI = extractDateInfo(e.start);
				const eI = extractDateInfo(e.end);
				const start = sI.dt ?? parseCalDate(e.start);
				const end = e.end ? (eI.dt ?? parseCalDate(e.end)) : undefined;
				const rawStartYMD = sI.ymd;
				const rawEndYMD = eI.ymd;
				const flaggedAllDay = e.allDay === true || e.isAllDay === true;
				const looksDateOnlyStart = rawStartYMD !== null;
				const looksDateOnlyEnd = rawEndYMD !== null;
				const bothMidnights = end
					? isMidnightInZone(start, timeZone) && isMidnightInZone(end, timeZone)
					: false;
				const spansDays = end ? !sameDay(start, end) : false;
				const allDayBySpan = bothMidnights && spansDays;
				const allDay =
					looksDateOnlyStart ||
					allDayBySpan ||
					(flaggedAllDay && (looksDateOnlyStart || looksDateOnlyEnd || allDayBySpan));
				return {
					id: e.id,
					title: e.summary ?? e.title ?? '',
					start,
					end,
					calendarId: e.calendarId ?? e.calendar ?? e.cal ?? '',
					allDay,
					rawStartYMD,
					rawEndYMD
				} as CalEvent;
			});
			let overlays: CalendarOverlayEvent[] = [];
			if (overlayRes.ok) {
				try {
					const raw = await overlayRes.json();
					if (Array.isArray(raw)) overlays = raw as CalendarOverlayEvent[];
				} catch {
					overlays = [];
				}
			}
			const overlayEvents: CalEvent[] = [];
			for (const ov of overlays) {
				if (!ov?.title || !ov.startDate) continue;
				const start = parseCalDate(ov.startDate);
				const end = ov.endDate ? parseCalDate(ov.endDate) : undefined;
				const rawStartYMD = ov.startDate.slice(0, 10);
				const rawEndYMD = (ov.endDate ?? ov.startDate).slice(0, 10);
				overlayEvents.push({
					id: ov.id,
					title: ov.title,
					start,
					end,
					calendarId: ov.calendarId ?? 'overlay',
					allDay: ov.allDay !== false,
					rawStartYMD,
					rawEndYMD
				});
			}
			if (overlayEvents.length) {
				listEvents = listEvents.concat(overlayEvents);
			}
			rawEvents = listEvents;
			// Ensure calendars map entries and improve names/colors from events when needed
			for (const e of arr) {
				const id = e.calendarId ?? e.calendar ?? e.cal ?? 'default';
				if (!id) continue;
				const existing = calendars.get(id);
				const nextName = e.calendarName ?? e.source ?? existing?.name ?? 'Calendar';
				const nextColor = e.calendarColor ?? e.color ?? existing?.color ?? '#888';
				const nextIcon = e.icon ?? existing?.icon ?? '';
				const nextSortRaw = e.sortOrder ?? e.sort ?? e.order ?? e.position;
				const nextSort = Number.isFinite(Number(nextSortRaw))
					? Number(nextSortRaw)
					: existing?.sortOrder;
				if (!existing) {
					calendars.set(id, {
						id,
						name: nextName,
						color: nextColor,
						icon: nextIcon,
						sortOrder: nextSort
					});
				} else {
					const nameLooksLikeId =
						!existing.name ||
						existing.name === id ||
						looksLikeUrl(existing.name) ||
						looksLikeEmail(existing.name);
					if (nameLooksLikeId && nextName) existing.name = nextName;
					if (existing.color !== nextColor) existing.color = nextColor;
					if (existing.icon !== nextIcon) existing.icon = nextIcon;
					if (typeof nextSort === 'number' && existing.sortOrder !== nextSort)
						existing.sortOrder = nextSort;
				}
			}
		} catch {}
	};

	const loadTasks = async (): Promise<DashboardTask[]> => {
		try {
			const response = await fetch('/api/tasks', {
				cache: 'no-store',
				headers: { accept: 'application/json' }
			});
			if (!response.ok) {
				console.error(`Tasks API fetch failed with status ${response.status}`);
				tasks = [];
				return [];
			}
			const raw: unknown = await response.json();
			const nextTasks = normalizeOmniCalTasks(raw, {
				todayKey: keyOf(new Date()),
				visibleDateKeys: getVisibleDateKeys()
			});
			tasks = nextTasks;
			return nextTasks;
		} catch (error) {
			console.error('Tasks API fetch failed:', error);
			tasks = [];
			return [];
		}
	};

	const buildVisibleDays = () => {
		const ymd = keyFormatter.format(new Date());
		const parts = ymd.split('-').map(Number);
		const start = new Date(parts[0], parts[1] - 1, parts[2]);
		visibleDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));
	};
	const getVisibleDateKeys = (): string[] => visibleDays.map((d) => keyOf(d));

	const isCurrent = (e: CalEvent) => {
		const s = e.start as Date;
		const end = e.end ? (e.end as Date) : s;
		return +now >= +s && +now <= +end;
	};
	const isPast = (e: CalEvent) => {
		const end = e.end ? (e.end as Date) : (e.start as Date);
		return +now > +end;
	};

	const getAllDayRange = (e: CalEvent): { start: Date; end: Date } => {
		const rawStart = e.start as Date;
		const start = startOfDay(rawStart);
		const rawEnd = (e.end as Date | undefined) || start;
		let end = startOfDay(rawEnd);
		if (e.rawEndYMD && (e.allDay || e.rawStartYMD)) {
			if (!e.rawStartYMD || e.rawEndYMD !== e.rawStartYMD) {
				const [yy, mm, dd] = e.rawEndYMD.split('-').map(Number);
				end = new Date(yy, mm - 1, dd);
				end.setDate(end.getDate() - 1);
			}
		} else if (
			e.allDay &&
			isMidnightInZone(rawStart, timeZone) &&
			isMidnightInZone(rawEnd, timeZone) &&
			!sameDay(rawStart, rawEnd)
		) {
			end = new Date(rawEnd);
			end.setDate(end.getDate() - 1);
			end = startOfDay(end);
		}
		if (end < start) end = start;
		return { start, end };
	};

	const sortAllDayItems = (left: AllDayItem, right: AllDayItem): number => {
		if (left.kind !== right.kind) return left.kind === 'event' ? -1 : 1;
		if (left.kind === 'event' && right.kind === 'event') {
			if (left.sortStart !== right.sortStart) return left.sortStart - right.sortStart;
			if (left.sortEnd !== right.sortEnd) return right.sortEnd - left.sortEnd;
			const titleCompare = left.e.title.localeCompare(right.e.title, undefined, {
				sensitivity: 'base'
			});
			if (titleCompare !== 0) return titleCompare;
		}
		if (left.kind === 'task' && right.kind === 'task') {
			const positionCompare = left.task.position.localeCompare(right.task.position, undefined, {
				numeric: true,
				sensitivity: 'base'
			});
			if (positionCompare !== 0) return positionCompare;
			const titleCompare = left.task.title.localeCompare(right.task.title, undefined, {
				sensitivity: 'base'
			});
			if (titleCompare !== 0) return titleCompare;
		}
		return left.sourceIndex - right.sourceIndex;
	};

	const computeAllDayLayout = (): Record<string, AllDayItem[]> => {
		const itemsByDay: Record<string, AllDayItem[]> = {};
		for (const day of visibleDays) itemsByDay[keyOf(day)] = [];

		displayEvents.forEach((e, sourceIndex) => {
			if (!e.allDay) return;
			const { start, end } = getAllDayRange(e);
			for (const day of visibleDays) {
				const dayStart = startOfDay(day);
				if (dayStart < start || dayStart > end) continue;
				const dayKey = keyOf(day);
				itemsByDay[dayKey]?.push({
					kind: 'event',
					e,
					isStart: sameDay(start, day),
					isEnd: sameDay(end, day),
					sortStart: start.getTime(),
					sortEnd: end.getTime(),
					sourceIndex
				});
			}
		});

		tasks.forEach((task, sourceIndex) => {
			if (!task.dateKey || !itemsByDay[task.dateKey]) return;
			itemsByDay[task.dateKey].push({ kind: 'task', task, sourceIndex });
		});

		for (const dayKey in itemsByDay) {
			itemsByDay[dayKey] = itemsByDay[dayKey].sort(sortAllDayItems);
		}
		return itemsByDay;
	};

	const allDayItemKey = (item: AllDayItem, dayKey: string, index: number): string =>
		item.kind === 'task'
			? `task:${item.task.id}`
			: `event:${item.e.id ?? `${item.e.calendarId || ''}:${item.e.title}:${String(item.e.start)}`}:${dayKey}:${index}`;

	const groupTimedForDay = (d: Date): Array<{ mins: number; items: CalEvent[] }> => {
		const list = displayEvents.filter((e) => !e.allDay && sameDay(e.start as Date, d));
		const groups = new Map<number, CalEvent[]>();
		for (const e of list) {
			const dt = e.start as Date;
			const mins = dt.getHours() * 60 + dt.getMinutes();
			if (!groups.has(mins)) groups.set(mins, []);
			groups.get(mins)!.push(e);
		}
		return Array.from(groups.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([mins, items]) => ({ mins, items }));
	};

	const refreshCalendarData = async (includeCalendars = false) => {
		buildVisibleDays();
		if (includeCalendars) await loadCalendars();
		await loadEvents();
		await loadTasks();
		lastEventsReloadAt = Date.now();
	};

	onMount(() => {
		(async () => {
			await refreshCalendarData(true);
		})();
		// Advance `now` on a fixed cadence so time-based classes (is-current, is-past) stay in sync.
		tick = window.setInterval(() => {
			const prevDayKey = lastDayKey;
			now = new Date();
			const currentDayKey = keyFormatter.format(now);
			const shouldReloadForDayChange = currentDayKey !== prevDayKey;
			const shouldReloadForPoll =
				EVENTS_POLL_MS > 0 && Date.now() - lastEventsReloadAt >= EVENTS_POLL_MS;
			if (shouldReloadForDayChange || shouldReloadForPoll) {
				if (shouldReloadForDayChange) {
					lastDayKey = currentDayKey;
				}
				(async () => {
					await refreshCalendarData();
				})();
			}
		}, 60 * 1000);
		return () => {
			if (tick) clearInterval(tick);
		};
	});

	$effect(() => {
		allDayItemsByDay = computeAllDayLayout();
	});
</script>

<section class={`cal ${className}`.trim()} aria-label="Calendar">
	<div class="cal-header">
		<div class="cal-legend" role="list">
			{#each Array.from(calendars.values()).sort((a, b) => {
				const aa = a.sortOrder ?? Number.POSITIVE_INFINITY;
				const bb = b.sortOrder ?? Number.POSITIVE_INFINITY;
				if (aa !== bb) return aa - bb;
				return (a.name || a.id).localeCompare(b.name || b.id, undefined, { sensitivity: 'base' });
			}) as c}
				<div
					class="cal-legend-item"
					role="listitem"
					style={`--cal-color: ${c.color || '#888'}`}
					title={displayCalName(c) || c.id}
				>
					<span class="swatch" aria-hidden="true"></span>
					{#if iconIsSvg(c.icon)}
						<span class="icon" aria-hidden="true" style="color: var(--cal-color)"
							>{@html iconHtml(c.icon || undefined)}</span
						>
					{:else if iconIsUrl(c.icon)}
						<span class="icon" aria-hidden="true"><img src={iconSrc(c.icon)} alt="" /></span>
					{:else if c.icon}
						<span class="icon" aria-hidden="true">{c.icon}</span>
					{/if}
					<span class="name">{displayCalName(c) || c.id}</span>
				</div>
			{/each}
		</div>
		<LastUpdated {dateTimeDisplay} timestamp={updatedAt} className="cal-last-updated" />
	</div>
	<div class="cal-grid">
		{#each visibleDays as d}
			{@const isWeekend = d.getDay() === 0 || d.getDay() === 6}
			{@const isToday = visibleDays.length === 7 && sameDay(d, new Date())}
			<div class="dow {isWeekend ? 'is-weekend' : ''} {isToday ? 'is-today' : ''}">
				{dateTime.formatDate(d, { preset: 'calendarWeekday', timeZone: null })}
			</div>
		{/each}
		{#each visibleDays as d, i}
			{@const dayKey = keyOf(d)}
			{@const allDayItems = allDayItemsByDay[dayKey] || []}
			<div
				class="day-cell {d.getDay() === 0 || d.getDay() === 6 ? 'is-weekend' : ''} {sameDay(
					d,
					new Date()
				)
					? 'is-today'
					: ''}"
				data-date={dayKey}
			>
				<div class="day-head">
					<span class="dom"
						>{dateTime.formatDate(d, { preset: 'calendarDayNumber', timeZone: null })}</span
					>
				</div>
				<div class="day-events-allday">
					{#each allDayItems as item, itemIndex (allDayItemKey(item, dayKey, itemIndex))}
						{#if item.kind === 'event'}
							{@const cal = calendars.get(item.e.calendarId || '')}
							{@const merged = isMerged(item.e) ? item.e : null}
							{@const mergedIconModel = merged ? getMergedIconModel(merged) : null}
							<div
								class={`event-chip all-day-chip ${item.isStart ? 'is-start' : ''} ${item.isEnd ? 'is-end' : ''}`}
								class:is-current={isCurrent(item.e)}
								class:is-past={isPast(item.e)}
								style={`--cal-color: ${cal?.color || '#888'}`}
								title={merged ? mergedChipTitle(item.e.title, merged) : item.e.title}
							>
								{#if merged}
									<span
										class={`event-icon merged-icon ${mergedIconModel?.className || ''}`}
										aria-hidden="true"
									>
										{#if mergedIconModel?.badge}
											<span class="merged-icon-badge">{mergedIconModel.badge}</span>
										{:else}
											{#each mergedIconModel?.tiles || [] as tile (tile.key)}
												<span
													class="merged-icon-tile"
													style={`--tile-color: ${tile.color}; ${tile.style}`}
												>
													{#if tile.mode === 'svg'}
														<span class="merged-icon-glyph" style={`color: ${tile.color}`}>
															{@html tile.html || ''}
														</span>
													{:else if tile.mode === 'url'}
														<img class="merged-icon-glyph" src={tile.src || ''} alt="" />
													{:else if tile.mode === 'text'}
														<span class="merged-icon-text" style={`color: ${tile.color}`}
															>{tile.text || ''}</span
														>
													{/if}
												</span>
											{/each}
										{/if}
									</span>
								{:else if iconIsSvg(cal?.icon)}
									<span class="event-icon" aria-hidden="true" style="color: var(--cal-color)"
										>{@html iconHtml(cal?.icon || undefined)}</span
									>
								{:else if iconIsUrl(cal?.icon)}
									<span class="event-icon" aria-hidden="true"
										><img src={iconSrc(cal?.icon)} alt="" /></span
									>
								{:else if cal?.icon}
									<span class="event-icon" aria-hidden="true">{cal?.icon}</span>
								{/if}
								<span class="event-title">{item.e.title}</span>
								{#if merged}
									<span class="event-sr-only">. {mergedContextText(merged)}</span>
								{/if}
							</div>
						{:else}
							<div
								class="event-chip all-day-chip task-chip is-start is-end"
								class:is-overdue={item.task.isOverdue}
								title={item.task.title}
							>
								<span class="task-indicator" aria-hidden="true"></span>
								<span class="event-title">{item.task.title}</span>
								<span class="event-sr-only">. Task{item.task.isOverdue ? ', overdue' : ''}</span>
							</div>
						{/if}
					{/each}
				</div>
				<div class="day-events-timed">
					{#each groupTimedForDay(d) as grp (String(grp.mins) + keyOf(d))}
						{@const grpIsCurrent = grp.items.some((x) => isCurrent(x))}
						{@const grpIsPast = grp.items.every((x) => isPast(x))}
						<div class="time-group">
							<span
								class="event-time time-label"
								class:is-current={grpIsCurrent}
								class:is-past={grpIsPast}
								>{dateTime.formatTime(
									new Date(2000, 0, 1, Math.floor(grp.mins / 60), grp.mins % 60),
									{ preset: 'eventTime', timeZone: null }
								)}</span
							>
							<div class="time-events">
								{#each grp.items as e, j (e.id ?? `${e.calendarId || ''}:${e.title}:${String(e.start)}:${j}`)}
									{@const cal = calendars.get(e.calendarId || '')}
									<div
										class="time-event"
										class:is-current={isCurrent(e)}
										class:is-past={isPast(e)}
										style={`--cal-color: ${cal?.color || '#888'}`}
										title={`${e.title}${cal?.name ? ` (${cal.name})` : ''}`}
									>
										{#if iconIsSvg(cal?.icon)}
											<span class="event-icon" aria-hidden="true" style="color: var(--cal-color)"
												>{@html iconHtml(cal?.icon || undefined)}</span
											>
										{:else if iconIsUrl(cal?.icon)}
											<span class="event-icon" aria-hidden="true"
												><img src={iconSrc(cal?.icon)} alt="" /></span
											>
										{:else if cal?.icon}
											<span class="event-icon" aria-hidden="true">{cal?.icon}</span>
										{/if}
										<span class="event-title">{e.title}</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
			{#if visibleDays.length > 7 && (i + 1) % 7 === 0}
				<div class="week-sep" aria-hidden="true"></div>
			{/if}
		{/each}
	</div>
</section>

<style>
	section.cal {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cal-header {
		align-items: end;
		display: flex;
		flex-wrap: nowrap;
		gap: 0.375rem;

		& :global(.cal-last-updated) {
			margin-left: auto;
		}
	}

	.cal-legend {
		align-items: center;
		display: flex;
		flex-wrap: nowrap;
		gap: 0.375rem;
		margin: 0;

		& .cal-legend-item {
			align-items: center;
			background:
				linear-gradient(
					to bottom right,
					color-mix(in oklch, var(--cal-color, var(--accent)), transparent 90%),
					color-mix(in oklch, var(--cal-color, var(--accent)), transparent 82%)
				),
				color-mix(in oklch, var(--card), transparent 6%);
			border: 0.0625rem solid color-mix(in oklch, var(--cal-color, var(--accent)), transparent 0%);
			border-radius: 62.4375rem;
			box-shadow: 0 0.25rem 0.75rem color-mix(in oklch, var(--bg), transparent 70%);
			color: var(--fg);
			display: inline-flex;
			font-size: 0.85rem;
			gap: 0.375rem;
			max-width: 12rem;
			padding: 0.15rem 0.5rem;

			& .swatch {
				border-radius: 62.4375rem;
				display: none;
				height: 0.75rem;
				width: 0.75rem;
			}

			& .icon {
				align-items: center;
				display: inline-flex;
				flex: 0 0 1.5em;
			}

			& .name {
				font-weight: 400;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
	}

	.cal-grid {
		backdrop-filter: blur(0.3rem);
		background: color-mix(in oklch, var(--card), transparent 60%);
		background-image: linear-gradient(135deg, oklch(100% 0 0 / 0.06), transparent);
		border: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 85%);
		border-radius: var(--radius);
		box-shadow: 0 0.5rem 1.5rem color-mix(in oklch, var(--bg), transparent 60%);
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		min-height: 0;
		overflow: hidden;

		& .dow {
			border-bottom: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 85%);
			border-right: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 90%);
			font-weight: 600;
			padding: 0.1rem;
			text-align: center;

			&.is-today {
				backdrop-filter: saturate(3.5);
				border-left: 0.25rem solid var(--accent);
				border-radius: var(--radius) 0 0 0;
				padding-left: calc(0.5rem - 0.25rem);
			}

			&.is-weekend {
				background:
					linear-gradient(180deg, var(--weekend-wash), transparent 55%),
					linear-gradient(135deg, oklch(100% 0 0 / 0.06), transparent),
					repeating-linear-gradient(
						135deg,
						color-mix(in oklch, var(--muted), transparent 97%) 0 6px,
						transparent 6px 14px
					);
				color: color-mix(in oklch, var(--accent), var(--muted) 70%);
			}
		}

		& .week-sep {
			grid-column: 1 / -1;
			height: 0.25rem;
		}
	}

	.day-cell {
		border-bottom: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 90%);
		border-right: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 90%);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-height: 8rem;
		padding: 0.175rem;
		position: relative;

		&.is-weekend {
			background:
				linear-gradient(180deg, var(--weekend-wash), transparent 55%),
				linear-gradient(135deg, oklch(100% 0 0 / 0.06), transparent),
				repeating-linear-gradient(
					135deg,
					color-mix(in oklch, var(--muted), transparent 97%) 0 6px,
					transparent 6px 14px
				);
		}

		&.is-today {
			backdrop-filter: saturate(3.5);
			border-left: 0.25rem solid var(--accent);
			border-radius: 0 0 0 var(--radius);
			padding-left: calc(0.5rem - 0.25rem);
		}

		& .day-head {
			align-items: baseline;
			display: inline-flex;
			flex-shrink: 0;
			font-weight: 800;
			gap: 0.4rem;

			& .dom {
				font-size: 1.15rem;
				line-height: 1;
			}
		}
	}

	.event-sr-only {
		border: 0;
		clip: rect(0 0 0 0);
		height: 1px;
		margin: -1px;
		overflow: hidden;
		padding: 0;
		position: absolute;
		white-space: nowrap;
		width: 1px;
	}

	.event-title {
		-webkit-box-orient: vertical;
		display: -webkit-box;
		font-size: 0.8rem;
		font-weight: 300;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		line-height: 1;
		overflow: hidden;
		overflow-wrap: anywhere;
		text-overflow: ellipsis;
	}

	.event-chip {
		align-items: center;
		background:
			linear-gradient(
				to bottom right,
				color-mix(in oklch, var(--cal-color, var(--accent)), transparent 78%),
				color-mix(in oklch, var(--cal-color, var(--accent)), transparent 66%)
			),
			color-mix(in oklch, var(--card), transparent 6%);
		border: 1px solid color-mix(in oklch, var(--cal-color, var(--accent)), transparent 0%);
		border-radius: 0.5rem;
		color: white;
		display: inline-flex;
		font-weight: 400;
		gap: 0.35em;
		padding: 0.1rem 0.2rem;
		&.is-current {
			box-shadow: 0 0.375rem 1rem color-mix(in oklch, var(--bg), transparent 55%);
			filter: brightness(1.05) saturate(1.05);
		}

		&.is-past {
			opacity: 0.65;
		}

		&.task-chip {
			background:
				linear-gradient(
					to bottom right,
					color-mix(in oklch, var(--fg), transparent 95%),
					color-mix(in oklch, var(--accent), transparent 91%)
				),
				color-mix(in oklch, var(--card), transparent 4%);
			border-color: color-mix(in oklch, var(--fg), transparent 76%);
			color: var(--fg);

			&.is-overdue {
				background:
					linear-gradient(
						to bottom right,
						color-mix(in oklch, var(--accent), transparent 88%),
						color-mix(in oklch, var(--accent), transparent 82%)
					),
					color-mix(in oklch, var(--card), transparent 4%);
				border-color: color-mix(in oklch, var(--accent), transparent 62%);
			}

			& .event-title {
				font-weight: 400;
			}

			& .task-indicator {
				border: 0.09375rem solid color-mix(in oklch, currentcolor, transparent 25%);
				border-radius: 0.2rem;
				display: inline-flex;
				flex: 0 0 0.78rem;
				height: 0.78rem;
				margin-left: 0.05rem;
				width: 0.78rem;
			}

			&.is-overdue .task-indicator {
				background: color-mix(in oklch, var(--accent), transparent 62%);
				border-color: color-mix(in oklch, var(--accent), var(--fg) 25%);
			}
		}

		& .merged-icon-badge {
			align-items: center;
			display: inline-flex;
			height: 100%;
			justify-content: center;
			text-align: center;
			text-shadow: 0 0.03em 0.1em color-mix(in oklch, black, transparent 60%);
			white-space: nowrap;
			width: 100%;

			&::selection {
				background: transparent;
			}
		}

		& .merged-icon-glyph {
			display: block;
			height: 100%;
			width: 100%;

			& svg {
				display: block;
				height: 100%;
				/* width: 100%; */
			}
		}

		& .merged-icon-text {
			align-items: center;
			display: inline-flex;
			font-size: 0.52em;
			font-weight: 700;
			height: 100%;
			justify-content: center;
			line-height: 1;
			text-shadow: 0 0.03em 0.08em color-mix(in oklch, black, transparent 65%);
			width: 100%;
		}

		& .merged-icon-tile {
			align-items: center;
			display: flex;
			justify-content: center;
			overflow: hidden;
			/* position: absolute; */

			& img.merged-icon-glyph {
				object-fit: cover;
				object-position: center;
			}
		}

		& .event-icon {
			align-items: center;
			display: inline-flex;
			flex: 0 0 1.5em;

			& img {
				display: block;
				height: 1.2em;
				width: 1.6em;
			}

			& svg {
				display: block;
				height: 1.2em;
				width: 1.6em;
			}
		}

		& .event-title {
			min-width: 0;
		}
	}

	.all-day-chip {
		&.is-end:not(.is-start) {
			border-radius: 0 0.75rem 0.75rem 0;
		}

		&.is-start.is-end {
			border-radius: 0.75rem;
		}

		&.is-start:not(.is-end) {
			border-radius: 0.75rem 0 0 0.75rem;
		}

		&:not(.is-start, .is-end) {
			border-radius: 0;
		}
	}

	.day-events-allday {
		display: grid;
		flex-shrink: 0;
		gap: 0.25rem;
		grid-auto-rows: 1.7rem;
		min-width: 0;

		& .event-chip {
			width: 100%;
		}
	}

	.day-events-timed {
		display: grid;
		gap: 0.2rem;
	}

	.event-time {
		align-items: center;
		background:
			linear-gradient(
				to bottom right,
				color-mix(in oklch, var(--cal-color, var(--muted)), transparent 88%),
				color-mix(in oklch, var(--cal-color, var(--muted)), transparent 76%)
			),
			color-mix(in oklch, var(--card), transparent 8%);
		border: 0.0625rem solid color-mix(in oklch, var(--cal-color, var(--muted)), transparent 65%);
		border-radius: 62.4375rem;
		color: var(--fg);
		display: inline-flex;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		gap: 0.5rem;
		line-height: 1;
		padding: 0.0625rem 0.5rem;
		white-space: nowrap;

		&.is-current {
			box-shadow: 0 0.25rem 0.75rem color-mix(in oklch, var(--bg), transparent 70%);
		}

		&.is-past {
			opacity: 0.6;
		}
	}

	.time-events {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}

	.time-group {
		align-items: start;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;

		& .time-events {
			flex: 1;
		}

		& .time-label {
			flex: 1;
		}
	}

	.time-event {
		align-items: center;
		border-left: 0.1875rem solid
			color-mix(in oklch, var(--cal-color, var(--accent)), transparent 0%);
		border-radius: 0.375rem;
		display: flex;
		gap: 0.375rem;
		justify-content: start;
		padding: 0.125rem 0.25rem;

		&.is-current {
			background: color-mix(in oklch, var(--cal-color, var(--accent)), transparent 85%);
			border: 1px solid color-mix(in oklch, var(--cal-color, var(--accent)), transparent 70%);
			box-shadow: 0 0.25rem 0.75rem color-mix(in oklch, var(--bg), transparent 60%);
		}

		&.is-past {
			opacity: 0.6;
		}

		& .day-events-timed .time-group + .time-group {
			border-top: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 90%);
			margin-top: 0;
			padding-top: 0.25rem;
		}

		& .event-icon {
			align-items: center;
			display: inline-flex;
			flex-shrink: 0;
			opacity: 0.9;

			& img {
				display: block;
				height: 1.2em;
				width: 1.2em;
			}

			& svg {
				display: block;
				height: 1.2em;
				width: 1.2em;
			}
		}

		& .event-title {
			min-width: 0;
		}
	}

	.event-chip .event-icon.merged-icon {
		align-items: center;
		background: transparent;
		border-radius: 0.28em;
		flex: 0 0 1.6em;
		height: 100%;
		justify-content: center;
		overflow: hidden;
		position: relative;
		width: 1.6em;

		&.merged-icon--aggregate {
			box-shadow: inset 0 0 0 0.05em color-mix(in oklch, white, transparent 87%);
			color: color-mix(in oklch, white, var(--accent) 8%);
			font-size: 0.58em;
			font-weight: 700;
			letter-spacing: -0.03em;
			line-height: 1;
		}

		& .merged-icon-glyph,
		& .merged-icon-glyph svg,
		& img.merged-icon-glyph {
			display: inline-flex;
			height: 100%;
			/* width: 100%; */
		}

		& img.merged-icon-glyph {
			object-fit: cover;
			object-position: center;
		}
	}

	@media (orientation: landscape) and (width >= 1100px) {
		.cal-grid {
			background: color-mix(in oklch, var(--card), transparent 20%);
			flex: 1;
			grid-template-rows: auto 1fr;
		}

		.day-cell {
			min-height: 0;
		}
	}
</style>
