<script lang="ts">
 	import SnowCap from '$lib/components/SnowCap.svelte';
 	import { type ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
 	import { createDateTimeFormatter, getResolvedDateTimeDisplaySettings } from '$lib/utils/dateTimeContext';
 	import { onMount } from 'svelte';
 	import LastUpdated from './LastUpdated.svelte';
 	import LottieWeatherIcon from './LottieWeatherIcon.svelte';

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

	type WeatherAstro = {
		moonrise?: string | number;
		moonset?: string | number;
		sunrise?: string | number;
		sunset?: string | number;
	};

	type WeatherCardProps = {
		initialWeather?: WeatherRoot | null;
		dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null;
	};

	let {
		initialWeather = null,
		dateTimeDisplay = null as ResolvedDateTimeDisplaySettings | null
	}: WeatherCardProps = $props();
	let wx = $state<WeatherRoot | null>(null);
	let nowClock = $state(new Date());
	let interval: number | undefined;
	let clockTick: number | undefined;
	let updatedAt = $state<string | null>(null);
	const dateTime = createDateTimeFormatter(() => getResolvedDateTimeDisplaySettings({ dateTimeDisplay }));

	$effect(() => {
		wx = initialWeather;
	});

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
	const lottiePathOf = (code?: string, main?: string) =>
		`/lottie/weather/${iconSlugOf(code, main)}.json`;
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
	const hm = (t?: string | number) => {
		if (!t) return '—';
		const direct = dateTime.formatTime(new Date(t), { preset: 'astroTime', timeZone: null });
		if (direct) return direct;
		const parsed = parseAstroTime(t, nowClock);
		return parsed ? dateTime.formatTime(parsed, { preset: 'astroTime', timeZone: null }) : '—';
	};

	const getCurrentWeather = (root: WeatherRoot): WeatherNow => (root.current || root.now || root) as WeatherNow;
	const getForecastDays = (root: WeatherRoot | null | undefined): Day[] => {
		if (!root) return [];
		if (Array.isArray(root.daily)) return root.daily;
		if (Array.isArray(root.forecast)) return root.forecast;
		if (Array.isArray(root.days)) return root.days;
		return [];
	};
	const getAstro = (root: WeatherRoot): WeatherAstro => {
		const anyRoot = root as Record<string, string | number | WeatherAstro | undefined>;
		const astro = root.astronomy || ((anyRoot.astro as WeatherAstro | undefined) ?? {});
		return {
			sunrise: astro.sunrise || (anyRoot.sunrise as string | number | undefined),
			sunset: astro.sunset || (anyRoot.sunset as string | number | undefined),
			moonrise: astro.moonrise || (anyRoot.moonrise as string | number | undefined),
			moonset: astro.moonset || (anyRoot.moonset as string | number | undefined)
		};
	};
	const getWindMph = (now: WeatherNow): number | undefined => {
		if (typeof now.windMph === 'number') return Math.round(now.windMph);
		const anyNow = now as Record<string, unknown>;
		if (typeof anyNow.wind_kph === 'number') return Math.round(anyNow.wind_kph * 0.621371);
		if (typeof anyNow.windKph === 'number') return Math.round(anyNow.windKph * 0.621371);
		return undefined;
	};
	const getHumidity = (now: WeatherNow): number | undefined => {
		if (typeof now.humidity === 'number') return now.humidity;
		const value = (now as Record<string, unknown>).rh;
		return typeof value === 'number' ? value : undefined;
	};
	const getDayDateValue = (day: Day): string | number => {
		const anyDay = day as Record<string, unknown>;
		return (anyDay.date as string | number | undefined) ?? day.day ?? day.time ?? day.ts ?? Date.now();
	};
	const getDayName = (day: Day): string => {
		const value = (day as Record<string, unknown>).name;
		return typeof value === 'string' ? value : '';
	};
	const getDayPop = (day: Day): number | undefined => {
		const anyDay = day as Record<string, unknown>;
		if (anyDay.pop === null) return 0;
		if (typeof anyDay.pop === 'number') return Math.round(anyDay.pop <= 1 ? anyDay.pop * 100 : anyDay.pop);
		if (typeof anyDay.precipPct === 'number') return Math.round(anyDay.precipPct);
		return undefined;
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
		event?: string;
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

	const normalizeAlerts = (root: unknown): NormalizedAlert[] => {
		if (!root || typeof root !== 'object') return [];
		const anyRoot = root as Record<string, unknown>;
		const raw = anyRoot.alerts ?? anyRoot.alert ?? anyRoot.warnings ?? [];
		const arr: Array<WxAlert | null | undefined> = Array.isArray(raw) ? raw : raw ? [raw as WxAlert] : [];
		return arr.reduce<NormalizedAlert[]>((items, a, idx) => {
			if (!a) return items;
			const titleSource = a.event ?? a.headline ?? a.title ?? a.name ?? a.description ?? a.desc;
			const title = String(titleSource || '').trim();
			if (!title) return items;
			const sevRaw = String((a.severity ?? '') || '').toLowerCase();
			let level = 'info';
			if (/(extreme|warning|red)/.test(sevRaw)) level = 'warning';
			else if (/(watch|orange|yellow)/.test(sevRaw)) level = 'watch';
			else if (/advisory|statement/.test(sevRaw)) level = 'advisory';
			const descriptionSource = a.description ?? a.desc;
			const description =
				typeof descriptionSource === 'string' ? descriptionSource.trim() || undefined : undefined;
			const next: NormalizedAlert = description
				? { id: String(a.id ?? idx), title, severity: level, description }
				: { id: String(a.id ?? idx), title, severity: level };
			items.push(next);
			return items;
		}, []);
	};

	const alertLottieFor = (severity: string): string => {
		const s = severity.toLowerCase();
		if (s === 'warning') return '/lottie/weather/code-red.json';
		if (s === 'watch') return '/lottie/weather/code-orange.json';
		if (s === 'advisory') return '/lottie/weather/code-yellow.json';
		return '/lottie/weather/code-green.json';
	};

	const loadWeather = async () => {
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
	};

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
			<LastUpdated {dateTimeDisplay} timestamp={updatedAt} className="wx-last-updated" />
			{#if alerts.length}
				<div class="wx-alerts" aria-live="polite" aria-label="Weather alerts">
					{#each alerts.slice(0, 3) as a (a.id)}
						{@const alertLottie = alertLottieFor(a.severity)}
						<div class={'wx-alert-pill wx-alert-pill--' + a.severity}>
							<span class="wx-alert-icon">
								<LottieWeatherIcon src={alertLottie} className="wx-alert-icon-img" />
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
		</div>
		{#key wx}
			{@const now = getCurrentWeather(wx)}
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
			{@const days = getForecastDays(root)}
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
			{@const windMphVal = getWindMph(now)}
			{@const humidity = getHumidity(now)}
			{@const summary =
				(now?.condition && (now.condition.desc || now.condition.main)) ||
				(pick(now, ['summary', 'desc', 'text']) ?? '')}
			{@const iconCode = now?.condition?.icon}
			{@const iconMain = now?.condition?.main || now?.condition?.desc}
			{@const lottieSrc = lottiePathOf(iconCode, iconMain)}
			{@const astro = getAstro(root)}
			{@const sunrise = astro.sunrise}
			{@const sunset = astro.sunset}
			{@const moonrise = astro.moonrise}
			{@const moonset = astro.moonset}
			{@const sunriseDate = parseAstroTime(sunrise, nowClock)}
			{@const sunsetDate = parseAstroTime(sunset, nowClock)}
			{@const moonriseDate = parseAstroTime(moonrise, nowClock)}
			{@const moonsetDate = parseAstroTime(moonset, nowClock)}
			{@const sunriseIsPast = sunriseDate ? +nowClock > +sunriseDate : false}
			{@const sunsetIsPast = sunsetDate ? +nowClock > +sunsetDate : false}
			{@const moonriseIsPast = moonriseDate ? +nowClock > +moonriseDate : false}
			{@const moonsetIsPast = moonsetDate ? +nowClock > +moonsetDate : false}
			{@const moonriseFirst = !moonsetDate || (moonriseDate && +moonriseDate <= +moonsetDate)}

			<div class="wx-current-main">
				<div class="wx-current">
					<div class="wx-current-temp">
						<span class="temp">{tempF}</span>
						<span class="unit"
							>{#if typeof tempF === 'number'}°F{/if}</span
						>
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
								><span
									class="ico"
									style={now?.windDeg !== undefined ? `transform: rotate(${now.windDeg}deg);` : ''}
									><LottieWeatherIcon
										src="/lottie/weather/wind.json"
										className="wi wi-stat"
										ariaLabel={now?.windDeg !== undefined ? `Wind ${windDir(now.windDeg)}` : 'Wind'}
									/></span
								>{windMphVal} mph</span
							>
						{/if}
						{#if humidity !== undefined}
							<span class="item humidity"
								><span class="ico"
									><LottieWeatherIcon
										src="/lottie/weather/humidity.json"
										className="wi wi-stat"
										ariaLabel="Humidity"
									/></span
								>{humidity}%</span
							>
						{/if}
					</div>
				</div>
				<div class="wx-astro">
					<div class="col sun">
						{#if sunrise}<span class="item sunrise" class:is-past={sunriseIsPast}
								><span class="ico"
									><LottieWeatherIcon
										src="/lottie/weather/sunrise.json"
										className="wi wi-astro"
										ariaLabel="Sunrise"
									/></span
								>{hm(sunrise)}</span
							>{/if}
						{#if sunset}<span class="item sunset" class:is-past={sunsetIsPast}
								><span class="ico"
									><LottieWeatherIcon
										src="/lottie/weather/sunset.json"
										className="wi wi-astro"
										ariaLabel="Sunset"
									/></span
								>{hm(sunset)}</span
							>{/if}
					</div>
					<div class="col moon">
						{#if moonriseFirst}
							{#if moonrise}<span class="item moonrise" class:is-past={moonriseIsPast}
									><span class="ico"
										><LottieWeatherIcon
											src="/lottie/weather/moonrise.json"
											className="wi wi-astro"
											ariaLabel="Moonrise"
										/></span
									>{hm(moonrise)}</span
								>{/if}
							{#if moonset}<span class="item moonset" class:is-past={moonsetIsPast}
									><span class="ico"
										><LottieWeatherIcon
											src="/lottie/weather/moonset.json"
											className="wi wi-astro"
											ariaLabel="Moonset"
										/></span
									>{hm(moonset)}</span
								>{/if}
						{:else}
							{#if moonset}<span class="item moonset" class:is-past={moonsetIsPast}
									><span class="ico"
										><LottieWeatherIcon
											src="/lottie/weather/moonset.json"
											className="wi wi-astro"
											ariaLabel="Moonset"
										/></span
									>{hm(moonset)}</span
								>{/if}
							{#if moonrise}<span class="item moonrise" class:is-past={moonriseIsPast}
									><span class="ico"
										><LottieWeatherIcon
											src="/lottie/weather/moonrise.json"
											className="wi wi-astro"
											ariaLabel="Moonrise"
										/></span
									>{hm(moonrise)}</span
								>{/if}
						{/if}
					</div>
				</div>
			</div>

			<!-- Forecast shows the next seven days after today for a full week at a glance. -->
			{@const forecast = getForecastDays(wx)}
			{#if forecast.length}
				<ol class="wx-forecast" aria-label="Forecast">
					{#each forecast.slice(1, 8) as d}
						{@const dateStr = getDayDateValue(d)}
						{@const dDate = parseYmdLocal(dateStr)}
						{@const label = Number.isNaN(+dDate)
							? getDayName(d)
							: dateTime.formatForecastWeekday(dDate)}
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
						{@const pop = getDayPop(d)}
						{@const slug = iconSlugOf(d?.condition?.icon, d?.condition?.main || d?.condition?.desc)}
						{@const forecastLottie = `/lottie/weather/${slug}.json`}
						<li>
							<div class="day">{label}</div>
							<div class="wxi">
								<LottieWeatherIcon
									src={forecastLottie}
									className="wi wi-forecast"
									ariaLabel={d?.condition?.main || d?.condition?.desc || ''}
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

<style>
	.wx-now {
		--wx-alert-desc-line-clamp: 4;

		align-items: center;
		display: grid;
		gap: 0.375rem;

		& .wx-topline {
			align-items: flex-end;
			color: var(--muted);
			display: flex;
			flex-direction: column;
			font-size: 0.95rem;
			gap: 0.25rem;
			justify-content: flex-end;
		}

		& .wx-alerts {
			display: grid;
			gap: 0.25rem;
			justify-content: flex-end;
			width: 100%;
		}

		& .wx-alert-pill {
			align-items: center;
			background:
				linear-gradient(
					to bottom right,
					color-mix(in oklch, var(--accent), transparent 86%),
					transparent
				),
				color-mix(in oklch, var(--card), transparent 40%);
			border: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 82%);
			border-radius: 0.75rem;
			display: inline-flex;
			font-size: 0.8rem;
			gap: 0.35rem;
			line-height: 1.2;
			margin-left: auto;
			max-width: 100%;
			padding: 0.15rem 0.6rem 0.15rem 0.25rem;
		}

		& .wx-alert-pill--warning {
			background:
				linear-gradient(
					to bottom right,
					color-mix(in oklch, var(--accent), transparent 70%),
					transparent
				),
				color-mix(in oklch, var(--card), transparent 10%);
			border-color: color-mix(in oklch, var(--accent), transparent 35%);
		}

		& .wx-alert-pill--watch {
			background:
				linear-gradient(
					to bottom right,
					color-mix(in oklch, var(--accent), transparent 80%),
					transparent
				),
				color-mix(in oklch, var(--card), transparent 8%);
			border-color: color-mix(in oklch, var(--accent), transparent 50%);
		}

		& .wx-alert-pill--advisory,
		& .wx-alert-pill--info {
			background: color-mix(in oklch, var(--card), transparent 40%);
		}

		& .wx-alert-icon {
			align-items: center;
			display: inline-flex;
			flex-shrink: 0;
		}

		& .wx-alert-icon :global(.wx-alert-icon-img) {
			display: block;
			height: 1.25rem;
			width: 1.25rem;
		}

		& .wx-alert-text {
			display: grid;
			gap: 0.05rem;
			min-width: 0;
		}

		& .wx-alert-label {
			font-weight: 700;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		& .wx-alert-desc {
			-webkit-box-orient: vertical;
			color: var(--muted);
			display: -webkit-box;
			font-size: 0.75rem;
			font-weight: 400;
			-webkit-line-clamp: var(--wx-alert-desc-line-clamp, 2);
			line-clamp: var(--wx-alert-desc-line-clamp, 2);
			max-width: 26rem;
			overflow: hidden;

			/* text-overflow: ellipsis; */

			/* white-space: nowrap; */
		}
	}

	.wx-forecast {
		display: grid;
		gap: 0.1rem;
		grid-template-columns: repeat(7, max-content);
		list-style: none;
		margin: 0;
		padding: 0;

		& li {
			background: color-mix(in oklch, var(--card), transparent 40%);
			border: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 88%);
			border-radius: 0.75rem;
			display: flex;
			flex-direction: column;
			gap: 0.2rem;
			padding: 0.5rem 0.375rem;
			text-align: center;
		}

		& .wxi :global(.wi-forecast) {
			display: inline-block;
			height: 3rem;
			width: 3rem;
		}

		& .day {
			font-weight: 700;
		}

		& .pop {
			font-size: 0.8rem;
			opacity: 0.8;
		}

		& .hilow {
			display: flex;
			flex-direction: column;
			font-size: 0.9rem;
			font-weight: 700;

			& .hi {
				color: var(--accent);
			}

			& .lo {
				opacity: 0.8;
			}
		}
	}

	.wx-current-main {
		align-items: end;
		display: flex;
		flex-direction: column;
		justify-content: end;

		& .wx-current {
			display: grid;
			font-size: clamp(2.5rem, 7vw, 5.5rem);
			font-weight: 800;
			gap: 1.25rem;
			grid-template-columns: auto auto 1fr;
			justify-content: space-between;
			line-height: 1;
			text-align: start;
			width: 100%;

			& .wx-current-temp {
				align-items: center;
				display: flex;

				& .temp {
					font-weight: 800;
				}

				& .unit {
					font-weight: 600;
				}
			}

			& .wx-feels {
				color: var(--muted);
			}

			& .wx-feels,
			& .wx-hilow-now {
				font-size: 1.05rem;
				opacity: 0.8;
			}

			& .wx-hilow-now {
				font-weight: 700;

				& .hi {
					color: var(--accent);
				}

				& .lo {
					opacity: 0.8;
				}
			}
		}

		& .wx-feels-row {
			align-items: start;
			display: flex;
			flex-direction: column;
			font-weight: 600;
			gap: 0.25rem;
			justify-content: center;
			line-height: 1;
		}

		& .wx-summary {
			color: var(--muted);
			font-size: 0.95rem;
			font-weight: 500;
			max-width: 10rem;
			text-align: center;
		}

		& .wx-icon {
			align-items: center;
			display: flex;
			flex-direction: column;
			opacity: 0.9;

			& :global(.wi-now),
			& :global(img.wi-now) {
				display: block;
				height: clamp(1em, 9vw, 6rem);
				width: auto;
			}
		}
	}

	.wx-stats {
		align-items: start;
		column-gap: 0.5rem;
		display: grid;
		grid-template-columns: repeat(3, max-content);
		justify-content: end;
		row-gap: 0.25rem;

		& > .wx-info,
		& > .wx-astro {
			display: contents;
		}

		& .wx-info {
			align-items: start;
			column-gap: 0.75rem;
			display: grid;
			grid-template-columns: repeat(2, max-content);
			justify-content: end;
			row-gap: 0.375rem;

			& .col,
			& .metrics {
				display: grid;
				gap: 0.375rem;
			}

			& .item {
				align-items: center;
				display: inline-flex;
				gap: 0.375rem;
			}
		}

		& .wx-astro {
			color: var(--muted);
			display: grid;
			font-weight: 600;
			gap: 0.5rem;
			grid-template-columns: repeat(2, max-content);
			justify-content: end;

			& .col {
				display: grid;
				gap: 0.375rem;
			}

			& .item {
				align-items: center;
				display: inline-flex;
				gap: 0.375rem;
			}

			& .item.is-past {
				opacity: 0.6;
			}

			& .ico {
				opacity: 0.9;
			}

			& :global(.wi-astro) {
				align-items: center;
				display: flex;
				height: 1.4rem;
				width: 1.4rem;
			}
		}

		& :global(.wi-stat) {
			align-items: center;
			display: flex;
			height: 1.2rem;
			width: 1.2rem;
		}
	}

	.wx-now,
	.wx-current-main,
	.wx-stats,
	.wx-forecast {
		& :global(path[stroke='rgb(55,65,81)']) {
			stroke: oklch(1 0 0);
		}
	}

	@media (orientation: landscape) and (width >= 1100px) {
		.wx-forecast {
			grid-template-columns: repeat(7, minmax(0, 1fr));
			width: 100%;
		}
	}
</style>
