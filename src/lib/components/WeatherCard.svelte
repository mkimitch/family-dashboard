<script lang="ts">
	import { onMount } from 'svelte';
	import LottieWeatherIcon from './LottieWeatherIcon.svelte';
	import LastUpdated from './LastUpdated.svelte';

	type Condition = { icon?: string; main?: string; desc?: string };
	type Day = {
		condition?: Condition;
		date?: string | number;
		day?: string | number;
		hi?: number;
		high?: number;
		lo?: number;
		low?: number;
		max?: number;
		maxTemp?: number;
		min?: number;
		minTemp?: number;
		name?: string;
		pop?: number | null;
		precipPct?: number;
		tempC?: { max?: number; min?: number };
		tempF?: { max?: number; min?: number };
		time?: string | number;
		ts?: string | number;
	};

	type WeatherNow = {
		condition?: Condition;
		desc?: string;
		feels_like?: number;
		feels?: number;
		feelsLikeC?: number;
		feelsLikeF?: number;
		humidity?: number;
		pressure?: number;
		rh?: number;
		summary?: string;
		temp?: number;
		tempC?: number;
		tempF?: number;
		text?: string;
		uv?: number;
		uvIndex?: number;
		visibility?: number;
		wind_kph?: number;
		windDeg?: number;
		windKph?: number;
		windMph?: number;
	};

	type WeatherRoot = {
		astronomy?: {
			moonrise?: string | number;
			moonset?: string | number;
			sunrise?: string | number;
			sunset?: string | number;
		};
		current?: WeatherNow;
		daily?: Day[];
		data?: any;
		days?: Day[];
		forecast?: Day[];
		moonrise?: string | number;
		moonset?: string | number;
		now?: WeatherNow;
		sunrise?: string | number;
		sunset?: string | number;
	};

	let { initialWeather = null } = $props();
	let wx = $state<WeatherRoot | null>(initialWeather);
	let nowClock = $state(new Date());
	let interval: number | undefined;
	let clockTick: number | undefined;
	let updatedAt = $state<string | null>(null);

	const FMT_TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
	const FMT_WEEKDAY_SHORT = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

	const c2f = (c: number) => Math.round((c * 9) / 5 + 32);
	const pick = <T extends object>(o: T | null | undefined, keys: (keyof any)[]): any => {
		for (const k of keys) {
			const v = (o as any)?.[k];
			if (v !== undefined && v !== null && v !== '') return v;
		}
		return undefined;
	};
	const iconSlugOf = (code?: string, main?: string) => {
		const m = String(main || '').toLowerCase();
		const night = typeof code === 'string' && /n$/.test(code);
		const c = typeof code === 'string' ? code : '';
		if (/^01/.test(c) || /\bclear\b/.test(m)) return night ? 'clear-night' : 'clear-day';
		if (/^02/.test(c)) return night ? 'partly-cloudy-night' : 'partly-cloudy-day';
		if (/^03/.test(c)) return 'cloudy';
		if (/^04/.test(c)) return 'overcast';
		if (/^09/.test(c)) return 'rain';
		if (/^10/.test(c)) return 'rain';
		if (/^11/.test(c) || /storm|thunder/.test(m)) return 'thunderstorms';
		if (/^13/.test(c) || /snow/.test(m)) return 'snow';
		if (/^50/.test(c) || /(mist|fog|haze|smoke)/.test(m)) return 'mist';
		if (/drizzle/.test(m)) return 'rain';
		if (/rain/.test(m)) return 'rain';
		if (/cloud/.test(m)) return 'cloudy';
		return night ? 'clear-night' : 'clear-day';
	};
	const iconUrlOf = (code?: string, main?: string) =>
		`/svg/static/${iconSlugOf(code, main)}.svg`;
	const lottiePathOf = (code?: string, main?: string) =>
		`/lottie/weather/${iconSlugOf(code, main)}.json`;
	const hm = (t?: string | number) => (t ? FMT_TIME.format(new Date(t)) : '—');
	const windDir = (deg?: number) => {
		if (typeof deg !== 'number') return '';
		const dirs = [
			'N',
			'NNE',
			'NE',
			'ENE',
			'E',
			'ESE',
			'SE',
			'SSE',
			'S',
			'SSW',
			'SW',
			'WSW',
			'W',
			'WNW',
			'NW',
			'NNW'
		];
		return dirs[Math.round(deg / 22.5) % 16];
	};
	const parseYmdLocal = (v: any) => {
		if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
			const [y, m, d] = v.split('-').map(Number);
			return new Date(y, m - 1, d);
		}
		return new Date(v);
	};
	const parseAstroTime = (v: any, base: Date): Date | null => {
		if (v === undefined || v === null || v === '') return null;
		try {
			const direct = new Date(v);
			if (!Number.isNaN(direct.getTime())) return direct;
		} catch {
			// fall through
		}
		if (typeof v === 'string') {
			const s = v.trim();
			const m = s.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?/i);
			if (m) {
				let hh = Number(m[1]);
				const mm = Number(m[2]) || 0;
				const ap = m[3]?.toLowerCase();
				if (ap === 'pm' && hh < 12) hh += 12;
				if (ap === 'am' && hh === 12) hh = 0;
				return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0, 0);
			}
		}
		return null;
	};

	const extractUpdatedAt = (root: WeatherRoot | null | undefined): string | null => {
		if (!root) return null;
		const anyRoot = root as any;
		const v =
			anyRoot?.updatedAt ??
			anyRoot?.updated_at ??
			anyRoot?.updateTime ??
			anyRoot?.last_updated ??
			anyRoot?.timestamp ??
			null;
		return typeof v === 'string' ? v : null;
	};

	type WxAlert = {
		id?: string | number;
		headline?: string;
		title?: string;
		name?: string;
		description?: string;
		desc?: string;
		severity?: string;
		urgency?: string;
		sender?: string;
		sender_name?: string;
		source?: string;
	};

	type NormalizedAlert = {
		id: string;
		title: string;
		severity: string;
		description?: string;
	};

	function normalizeAlerts(root: any): NormalizedAlert[] {
		if (!root) return [];
		const raw = (root.alerts ?? root.alert ?? root.warnings ?? []) as any;
		const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
		return arr
			.map((a: WxAlert | null | undefined, idx: number) => {
				if (!a) return null;
				const titleSource =
					a.event ?? a.headline ?? a.title ?? a.name ?? a.description ?? a.desc;
				const title = String(titleSource || '').trim();
				if (!title) return null;
				const sevRaw = String((a.severity ?? '') || '').toLowerCase();
				let level = 'info';
				if (/(extreme|warning|red)/.test(sevRaw)) level = 'warning';
				else if (/(watch|orange|yellow)/.test(sevRaw)) level = 'watch';
				else if (/advisory|statement/.test(sevRaw)) level = 'advisory';
				const rawDesc = (a.description ?? a.desc) as any;
				const description =
					typeof rawDesc === 'string' ? rawDesc.trim() || undefined : undefined;
				const id = String((a.id ?? idx) as any);
				return { id, title, severity: level, description };
			})
			.filter((x): x is NormalizedAlert => !!x);
	}

	const alertIconFor = (severity: string): string => {
		const s = severity.toLowerCase();
		if (s === 'warning') return '/svg/animated/code-red.svg';
		if (s === 'watch') return '/svg/animated/code-orange.svg';
		if (s === 'advisory') return '/svg/animated/code-yellow.svg';
		return '/svg/animated/code-green.svg';
	};

	async function loadWeather() {
		try {
			const r = await fetch('/api/weather', { cache: 'no-store' });
			if (!r.ok) return;
			if (r.status === 204) {
				wx = null;
				return;
			}
			const data = await r.json();
			wx = data?.data || data;
			const ts = extractUpdatedAt(wx);
			updatedAt = ts ?? new Date().toISOString();
		} catch {}
	}

	onMount(() => {
		if (wx && !updatedAt) {
			const ts = extractUpdatedAt(wx);
			if (ts) updatedAt = ts;
		}
		if (!wx) {
			loadWeather();
		}
		nowClock = new Date();
		interval = window.setInterval(loadWeather, 3 * 60 * 1000);
		clockTick = window.setInterval(() => {
			nowClock = new Date();
		}, 60 * 1000);
		return () => {
			if (interval) clearInterval(interval);
			if (clockTick) clearInterval(clockTick);
		};
	});
</script>

{#if wx}
	{@const alerts = normalizeAlerts(wx)}
	<!-- Now block -->
	<div class="wx-now">
		<div class="wx-topline">
			{#if alerts.length}
				<div class="wx-alerts" aria-live="polite" aria-label="Weather alerts">
					{#each alerts.slice(0, 3) as a (a.id)}
						{@const icon = alertIconFor(a.severity)}
						<div class={'wx-alert-pill wx-alert-pill--' + a.severity}>
							<span class="wx-alert-icon">
								<img
									class="wx-alert-icon-img"
									src={icon}
									alt=""
									loading="lazy"
								/>
							</span>
							<span class="wx-alert-text">
								<span class="wx-alert-label">{a.title}</span>
								{#if a.description}
									<span class="wx-alert-desc">{a.description}</span>
								{/if}
							</span>
						</div>
					{/each}
				</div>
			{/if}
			<LastUpdated timestamp={updatedAt} className="wx-last-updated" />
		</div>
		{#key wx}
			{@const now = (wx.current || wx.now || wx) as WeatherNow}
			{@const root = wx}
			{@const tempF =
				typeof now?.tempF === 'number'
					? Math.round(now.tempF)
					: typeof now?.tempC === 'number'
						? c2f(now.tempC)
						: typeof now?.temp === 'number'
							? Math.round(now.temp)
							: undefined}
			{@const feelsF =
				typeof now?.feelsLikeF === 'number'
					? Math.round(now.feelsLikeF)
					: typeof now?.feelsLikeC === 'number'
						? c2f(now.feelsLikeC)
						: typeof now?.feels === 'number'
							? Math.round(now.feels)
							: typeof now?.feels_like === 'number'
								? Math.round(now.feels_like)
								: undefined}
			{@const days = (root.daily || root.forecast || root.days || []) as Day[]}
			{@const d0 = days[0]}
			{@const todayHiF = d0
				? typeof d0?.tempF?.max === 'number'
					? Math.round(d0.tempF.max)
					: typeof d0?.tempC?.max === 'number'
						? c2f(d0.tempC.max)
						: pick(d0, ['high', 'max', 'maxTemp', 'hi'])
				: undefined}
			{@const todayLoF = d0
				? typeof d0?.tempF?.min === 'number'
					? Math.round(d0.tempF.min)
					: typeof d0?.tempC?.min === 'number'
						? c2f(d0.tempC.min)
						: pick(d0, ['low', 'min', 'minTemp', 'lo'])
				: undefined}
			{@const windMphVal =
				typeof now?.windMph === 'number'
					? Math.round(now.windMph)
					: typeof (now as any)?.wind_kph === 'number'
						? Math.round((now as any).wind_kph * 0.621371)
						: typeof (now as any)?.windKph === 'number'
							? Math.round((now as any).windKph * 0.621371)
							: undefined}
			{@const summary =
				(now?.condition && (now.condition.desc || now.condition.main)) ||
				(pick(now, ['summary', 'desc', 'text']) ?? '')}
			{@const iconCode = now?.condition?.icon}
			{@const iconMain = now?.condition?.main || now?.condition?.desc}
			{@const iconUrl = iconUrlOf(iconCode, iconMain)}
			{@const lottieSrc = lottiePathOf(iconCode, iconMain)}
			{@const astro = (root.astronomy || (root as any).astro || {}) as any}
			{@const sunrise = astro.sunrise || (root as any).sunrise}
			{@const sunset = astro.sunset || (root as any).sunset}
			{@const moonrise = astro.moonrise || (root as any).moonrise}
			{@const moonset = astro.moonset || (root as any).moonset}
			{@const sunriseDate = parseAstroTime(sunrise, nowClock)}
			{@const sunsetDate = parseAstroTime(sunset, nowClock)}
			{@const moonriseDate = parseAstroTime(moonrise, nowClock)}
			{@const moonsetDate = parseAstroTime(moonset, nowClock)}
			{@const sunriseIsPast = sunriseDate ? +nowClock > +sunriseDate : false}
			{@const sunsetIsPast = sunsetDate ? +nowClock > +sunsetDate : false}
			{@const moonriseIsPast = moonriseDate ? +nowClock > +moonriseDate : false}
			{@const moonsetIsPast = moonsetDate ? +nowClock > +moonsetDate : false}

			<div class="wx-current-main">
				<div class="wx-current">
					<div class="wx-current-temp">
						<span class="temp">{tempF}</span>
						<span class="unit">{#if typeof tempF === 'number'}°F{/if}</span>
					</div>
					<div class="wx-feels-row">
						{#if typeof feelsF === 'number'}
							<div class="wx-feels">
								Feels like {feelsF}°F
							</div>
						{/if}
						{#if todayHiF !== undefined || todayLoF !== undefined}
							<span class="wx-hilow-now">
								<span class="hi">{todayHiF === undefined ? '—' : `${todayHiF}°F`}</span>
								<span style="font-weight: 300;"> / </span>
								<span class="lo">{todayLoF === undefined ? '—' : `${todayLoF}°F`}</span>
							</span>
						{/if}
						{#if summary}
							<div class="wx-summary">{summary}</div>
						{/if}
					</div>
					<div class="wx-icon">
						<LottieWeatherIcon src={lottieSrc} className="wi wi-now" ariaLabel={summary} />
					</div>
				</div>
			</div>

			<div class="wx-stats">
				<div class="wx-info">
					<div class="col metrics">
						{#if typeof windMphVal === 'number'}
							<span class="item wind"
								><span class="ico"
									><img
										class="wi wi-stat"
										src="/svg/static/direction.svg"
										alt={now?.windDeg !== undefined ? `Wind ${windDir(now.windDeg)}` : 'Wind direction'}
										loading="lazy"
										style={now?.windDeg !== undefined ? `transform: rotate(${now.windDeg}deg);` : ''}
									/></span
								>{windMphVal} mph</span
							>
						{/if}
						{#if (now?.humidity ?? (now as any)?.rh) !== undefined}
							<span class="item humidity"
								><span class="ico"
									><img
										class="wi wi-stat"
										src="/svg/static/humidity.svg"
										alt="Humidity"
										loading="lazy"
									/></span
								>{(now?.humidity ?? (now as any)?.rh) as number}%</span
							>
						{/if}
					</div>
				</div>
				<div class="wx-astro">
					<div class="col sun">
						{#if sunrise}<span class="item sunrise" class:is-past={sunriseIsPast}
								><span class="ico"
									><img
										class="wi wi-astro"
										src="/svg/static/sunrise.svg"
										alt="Sunrise"
										loading="lazy"
									/></span
								>{hm(sunrise)}</span
							>{/if}
						{#if sunset}<span class="item sunset" class:is-past={sunsetIsPast}
									><span class="ico"
										><img
											class="wi wi-astro"
											src="/svg/static/sunset.svg"
											alt="Sunset"
										loading="lazy"
									/></span
								>{hm(sunset)}</span
							>{/if}
					</div>
					<div class="col moon">
						{#if moonrise}<span class="item moonrise" class:is-past={moonriseIsPast}
								><span class="ico"
									><img
										class="wi wi-astro"
										src="/svg/static/moonrise.svg"
										alt="Moonrise"
										loading="lazy"
									/></span
								>{hm(moonrise)}</span
							>{/if}
						{#if moonset}<span class="item moonset" class:is-past={moonsetIsPast}
									><span class="ico"
										><img
											class="wi wi-astro"
											src="/svg/static/moonset.svg"
											alt="Moonset"
										loading="lazy"
									/></span
								>{hm(moonset)}</span
							>{/if}
					</div>
				</div>
			</div>

			<!-- Forecast shows the next seven days after today for a full week at a glance. -->
			{@const forecast = (wx.daily || wx.forecast || wx.days || []) as Day[]}
			{#if forecast.length}
				<ol class="wx-forecast" aria-label="Forecast">
					{#each forecast.slice(1, 8) as d}
						{@const dateStr = (d as any).date ?? d.day ?? d.time ?? d.ts ?? Date.now()}
						{@const dDate = parseYmdLocal(dateStr)}
						{@const label = Number.isNaN(+dDate)
							? (d as any)?.name || ''
							: FMT_WEEKDAY_SHORT.format(dDate)}
						{@const hiF =
							typeof d?.tempF?.max === 'number'
								? Math.round(d.tempF.max)
								: typeof d?.tempC?.max === 'number'
									? c2f(d.tempC.max)
									: pick(d, ['high', 'max', 'maxTemp', 'hi'])}
						{@const loF =
							typeof d?.tempF?.min === 'number'
								? Math.round(d.tempF.min)
								: typeof d?.tempC?.min === 'number'
									? c2f(d.tempC.min)
									: pick(d, ['low', 'min', 'minTemp', 'lo'])}
						{@const pop =
						(d as any)?.pop === null
							? 0
								: typeof (d as any)?.pop === 'number'
									? Math.round((d as any).pop <= 1 ? (d as any).pop * 100 : (d as any).pop)
									: typeof (d as any)?.precipPct === 'number'
										? Math.round((d as any).precipPct)
										: undefined}
						{@const slug = iconSlugOf(d?.condition?.icon, d?.condition?.main || d?.condition?.desc)}
					{@const icoUrl = `/svg/static/${slug}.svg`}
						<li>
							<div class="day">{label}</div>
							<div class="wxi">
								<img
									class="wi wi-forecast"
									src={icoUrl}
									alt={d?.condition?.main || d?.condition?.desc || ''}
									loading="lazy"
								/>
							</div>
							<div class="pop">{pop === undefined ? '' : `${pop}%`}</div>
							<div class="hilow">
								<span class="hi">{hiF === undefined ? '—' : `${hiF}°F`}</span>
								<span class="lo">{loF === undefined ? '—' : `${loF}°F`}</span>
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		{/key}
	</div>
{/if}
