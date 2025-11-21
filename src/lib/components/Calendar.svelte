<script lang="ts">
	import { onMount } from 'svelte';

	type CalInfo = { id: string; name?: string; color?: string; icon?: string; sortOrder?: number };
	type Event = {
		id?: string;
		title: string;
		start: string | number | Date;
		end?: string | number | Date;
		calendarId?: string;
		allDay?: boolean;
		rawStartYMD?: string | null;
		rawEndYMD?: string | null;
	};
	type ApiEvent = any;

	let calendars = $state(new Map<string, CalInfo>());
	let events = $state<Event[]>([]);
	let visibleDays = $state<Date[]>([]);
	let allDayMinHeights = $state<Record<string, string>>({});
	let allDayRowsByDay = $state<
		Record<string, Array<{ e: Event; isStart: boolean; isEnd: boolean }>>
	>({});
	let allDayTrackCountByDay = $state<Record<string, number>>({});
	let now = $state(new Date());
	let timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;
	let tick: number | undefined;
	let { class: className = '' } = $props();

	const FMT_SHORT = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
	const FMT_DAY = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
	const FMT_TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
	const createKeyFormatter = (zone?: string) =>
		new Intl.DateTimeFormat('en-CA', {
			timeZone: zone || undefined,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});

	let keyFormatter = createKeyFormatter(timeZone);
	$effect(() => {
		keyFormatter = createKeyFormatter(timeZone);
	});

	const keyOf = (d: Date) => keyFormatter.format(d);
	const sameDay = (a: Date, b: Date) => keyOf(a) === keyOf(b);

	function startOfWeek(d: Date) {
		const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		const dow = r.getDay();
		r.setDate(r.getDate() - dow);
		return r;
	}
	function addDays(d: Date, n: number) {
		const r = new Date(d);
		r.setDate(r.getDate() + n);
		return r;
	}
	const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
	function parseCalDate(v: any): Date {
		if (v instanceof Date) return v;
		if (typeof v === 'string') {
			const m = v.match(DATE_ONLY_RE);
			if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
		}
		const n = typeof v === 'number' ? v : Date.parse(v);
		return Number.isFinite(n) ? new Date(n) : new Date();
	}
	function extractDateInfo(v: any): { ymd: string | null; dt: Date | null } {
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
	}
	function startOfDay(d: Date) {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}
	function daysBetween(a: Date, b: Date) {
		const A = startOfDay(a).getTime();
		const B = startOfDay(b).getTime();
		return Math.round((B - A) / 86400000);
	}
	function isMidnightInZone(d: Date, zone: string | undefined): boolean {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			hour12: false
		}).formatToParts(d);
		const val = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
		return val('hour') === 0 && val('minute') === 0 && val('second') === 0;
	}
	let ICON_SEQ = 0;
	const iconIsSvg = (s?: string) => typeof s === 'string' && s.includes('<svg');
	const iconIsUrl = (s?: string) =>
		typeof s === 'string' &&
		(/^data:image\/svg\+xml/i.test(s) ||
			/^https?:\/\//.test(s) ||
			s.startsWith('/') ||
			/\.svg(\?|$)/i.test(s));
	function namespaceSvgIds(svg: string): string {
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
	}
	const iconHtml = (s?: string) => (iconIsSvg(s) ? namespaceSvgIds(String(s).trim()) : '');

	const looksLikeUrl = (s?: string) => typeof s === 'string' && /^(https?:)?\/\//i.test(s);
	const looksLikeEmail = (s?: string) => typeof s === 'string' && /@/.test(s || '');
	function displayCalName(c?: CalInfo): string {
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
	}

	async function loadCalendars() {
		try {
			const r = await fetch('/api/calendars');
			if (!r.ok) return;
			const list = await r.json();
			const map = new Map<string, CalInfo>();
			for (const c of list || []) {
				const enabled = c?.enabled === undefined || Boolean(c?.enabled);
				if (!enabled) continue;
				const id = c.id ?? c.calendarId ?? c.name ?? c.label ?? '';
				if (!id) continue;
				const name = c.label ?? c.name ?? id;
				const color = c.color ?? c.calendarColor ?? '#888';
				const icon = c.icon ?? '';
				const sortOrder = Number.isFinite(Number(c.sortOrder)) ? Number(c.sortOrder) : undefined;
				map.set(id, { id, name, color, icon, sortOrder });
			}
			calendars = map;
		} catch {}
	}

	async function loadEvents() {
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
			const r = await fetch(qs, { cache: 'no-store', headers: { accept: 'application/json' } });
			if (!r.ok) return;
			const data = await r.json();
			timeZone = (data && typeof data.zone === 'string' && data.zone) || timeZone;
			buildVisibleDays();
			const arr: ApiEvent[] = Array.isArray(data?.events)
				? data.events
				: Array.isArray(data)
					? data
					: [];
			events = arr.map((e) => {
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
				} as Event;
			});
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
	}

	function buildVisibleDays() {
		const ymd = keyFormatter.format(new Date());
		const parts = ymd.split('-').map(Number);
		const start = new Date(parts[0], parts[1] - 1, parts[2]);
		visibleDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));
	}

	function isCurrent(e: Event) {
		const s = e.start as Date;
		const end = e.end ? (e.end as Date) : s;
		return +now >= +s && +now <= +end;
	}
	function isPast(e: Event) {
		const end = e.end ? (e.end as Date) : (e.start as Date);
		return +now > +end;
	}

	function computeAllDayLayout() {
		// Track allocation ensures overlapping all-day events render in consistent rows without collisions.
		const countsByDay: Record<string, number> = {};
		const rowsByDay: Record<string, Array<{ e: Event; isStart: boolean; isEnd: boolean }>> = {};
		if (!visibleDays.length) return { countsByDay, rowsByDay };
		const weeks = Math.ceil(visibleDays.length / 7) || 1;
		for (let wi = 0; wi < weeks; wi++) {
			const weekStart = visibleDays[wi * 7];
			if (!weekStart) continue;
			const weekEnd = addDays(weekStart, 6);
			const visKeys = Array.from({ length: 7 }, (_, di) => keyOf(addDays(weekStart, di)));
			const multi = events.filter((e) => e.allDay);
			const trackEnds: number[] = [];
			const allocations: Array<{ ti: number; si: number; ei: number; e: Event }> = [];
			for (const e of multi) {
				const s0 = e.start as Date;
				const e0 = (e.end as Date) || s0;

				let effectiveEnd = e0;
				if (e.rawEndYMD && (e.allDay || e.rawStartYMD)) {
					if (!e.rawStartYMD || e.rawEndYMD !== e.rawStartYMD) {
						const [yy, mm, dd] = e.rawEndYMD.split('-').map(Number);
						const tmp = new Date(yy, mm - 1, dd);
						tmp.setDate(tmp.getDate() - 1);
						effectiveEnd = tmp;
					}
				} else if (
					e.allDay &&
					isMidnightInZone(s0, timeZone) &&
					isMidnightInZone(e0, timeZone) &&
					!sameDay(s0, e0)
				) {
					const tmp = new Date(e0);
					tmp.setDate(tmp.getDate() - 1);
					effectiveEnd = tmp;
				}
				let s = s0 < weekStart ? weekStart : s0;
				let eEnd = effectiveEnd > weekEnd ? weekEnd : effectiveEnd;
				if (eEnd < weekStart || s > weekEnd) continue;
				const startKey = e.rawStartYMD || keyOf(s);
				const endKeyIncl = keyOf(eEnd);
				let si = visKeys.indexOf(startKey);
				if (si === -1)
					si =
						s <= weekStart
							? 0
							: s >= weekEnd
								? 6
								: Math.max(0, Math.min(6, daysBetween(weekStart, s)));
				let ei = visKeys.indexOf(endKeyIncl);
				if (ei === -1)
					ei =
						eEnd <= weekStart
							? 0
							: eEnd >= weekEnd
								? 6
								: Math.max(si, Math.min(6, daysBetween(weekStart, eEnd)));
				let ti = 0;
				let placed = false;
				for (; ti < trackEnds.length; ti++) {
					if (trackEnds[ti] < si) {
						trackEnds[ti] = ei;
						placed = true;
						break;
					}
				}
				if (!placed) {
					ti = trackEnds.length;
					trackEnds.push(ei);
				}
				allocations.push({ ti, si, ei, e });
			}

			for (let di = 0; di < 7; di++) {
				const day = addDays(weekStart, di);
				const key = keyOf(day);
				countsByDay[key] = trackEnds.length;
				const rows: Array<{ e: Event; isStart: boolean; isEnd: boolean }> = [];
				for (const a of allocations) {
					if (di >= a.si && di <= a.ei) {
						rows[a.ti] = { e: a.e, isStart: di === a.si, isEnd: di === a.ei };
					}
				}
				rowsByDay[key] = rows;
			}
		}
		return { countsByDay, rowsByDay };
	}

	function groupTimedForDay(d: Date): Array<{ mins: number; items: Event[] }> {
		const list = events.filter((e) => !e.allDay && sameDay(e.start as Date, d));
		const groups = new Map<number, Event[]>();
		for (const e of list) {
			const dt = e.start as Date;
			const mins = dt.getHours() * 60 + dt.getMinutes();
			if (!groups.has(mins)) groups.set(mins, []);
			groups.get(mins)!.push(e);
		}
		return Array.from(groups.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([mins, items]) => ({ mins, items }));
	}

	onMount(() => {
		buildVisibleDays();
		(async () => {
			await Promise.all([loadCalendars(), loadEvents()]);
			const layout = computeAllDayLayout();
			allDayTrackCountByDay = layout.countsByDay;
			allDayRowsByDay = layout.rowsByDay;
			allDayMinHeights = Object.fromEntries(
				Object.entries(layout.countsByDay).map(([k, n]) => [
					k,
					n ? `${0.5 + n * 1.5}rem` : '0.5rem'
				])
			);
		})();
		// Advance `now` on a fixed cadence so time-based classes (is-current, is-past) stay in sync.
		tick = window.setInterval(() => {
			now = new Date();
		}, 60 * 1000);
		return () => {
			if (tick) clearInterval(tick);
		};
	});

	$effect(() => {
		const layout = computeAllDayLayout();
		allDayTrackCountByDay = layout.countsByDay;
		allDayRowsByDay = layout.rowsByDay;
		allDayMinHeights = Object.fromEntries(
			Object.entries(layout.countsByDay).map(([k, n]) => [k, n ? `${0.5 + n * 1.5}rem` : '0.5rem'])
		);
	});
</script>

<section class={`cal ${className}`.trim()} aria-label="Calendar">
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
						>{@html iconHtml(c.icon)}</span
					>
				{:else if iconIsUrl(c.icon)}
					<span class="icon" aria-hidden="true"><img src={c.icon as string} alt="" /></span>
				{:else if c.icon}
					<span class="icon" aria-hidden="true">{c.icon}</span>
				{/if}
				<span class="name">{displayCalName(c) || c.id}</span>
			</div>
		{/each}
	</div>
	<div class="cal-grid">
		{#each visibleDays as d}
			{@const isWeekend = d.getDay() === 0 || d.getDay() === 6}
			{@const isToday = visibleDays.length === 7 && sameDay(d, new Date())}
			<div class="dow {isWeekend ? 'is-weekend' : ''} {isToday ? 'is-today' : ''}">
				{FMT_SHORT.format(d)}
			</div>
		{/each}
		{#each visibleDays as d, i}
			{@const dayKey = keyOf(d)}
			{@const trackCount = allDayTrackCountByDay[dayKey] || 0}
			{@const rows = allDayRowsByDay[dayKey] || []}
			<div
				class="day-cell {d.getDay() === 0 || d.getDay() === 6 ? 'is-weekend' : ''} {sameDay(
					d,
					new Date()
				)
					? 'is-today'
					: ''}"
				data-date={dayKey}
				style={`--allday-min-h: ${allDayMinHeights[dayKey] || '0.5rem'}`}
			>
				<div class="day-head">
					<span class="dom">{FMT_DAY.format(d)}</span>
				</div>
				<div class="day-events-allday">
					{#each Array.from({ length: trackCount }) as _, ti}
						{@const row = rows[ti]}
						{#if row}
							{@const cal = calendars.get(row.e.calendarId || '')}
							<div
								class={`event-chip all-day-chip ${row.isStart ? 'is-start' : ''} ${row.isEnd ? 'is-end' : ''}`}
								class:is-current={isCurrent(row.e)}
								class:is-past={isPast(row.e)}
								style={`--cal-color: ${cal?.color || '#888'}`}
								title={row.e.title}
							>
								{#if iconIsSvg(cal?.icon)}
									<span class="event-icon" aria-hidden="true" style="color: var(--cal-color)"
										>{@html iconHtml(cal?.icon as string)}</span
									>
								{:else if iconIsUrl(cal?.icon)}
									<span class="event-icon" aria-hidden="true"
										><img src={cal?.icon as string} alt="" /></span
									>
								{:else if cal?.icon}
									<span class="event-icon" aria-hidden="true">{cal?.icon}</span>
								{/if}
								<span class="event-title">{row.e.title}</span>
							</div>
						{:else}
							<div class="event-chip placeholder" aria-hidden="true"></div>
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
								>{FMT_TIME.format(
									new Date(2000, 0, 1, Math.floor(grp.mins / 60), grp.mins % 60)
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
												>{@html iconHtml(cal?.icon as string)}</span
											>
										{:else if iconIsUrl(cal?.icon)}
											<span class="event-icon" aria-hidden="true"
												><img src={cal?.icon as string} alt="" /></span
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
