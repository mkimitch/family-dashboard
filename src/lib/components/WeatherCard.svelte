<script lang="ts">
	import { onMount } from 'svelte';

	type Condition = { icon?: string; main?: string; desc?: string };
	type Day = {
		date?: string | number;
		day?: string | number;
		time?: string | number;
		ts?: string | number;
		name?: string;
		pop?: number | null;
		precipPct?: number;
		condition?: Condition;
		tempF?: { max?: number; min?: number };
		tempC?: { max?: number; min?: number };
		high?: number;
		max?: number;
		maxTemp?: number;
		hi?: number;
		low?: number;
		min?: number;
		minTemp?: number;
		lo?: number;
	};

	type WeatherNow = {
		tempF?: number;
		tempC?: number;
		temp?: number;
		feelsLikeF?: number;
		feelsLikeC?: number;
		feels?: number;
		feels_like?: number;
		humidity?: number;
		rh?: number;
		uvIndex?: number;
		uv?: number;
		visibility?: number;
		pressure?: number;
		windMph?: number;
		wind_kph?: number;
		windKph?: number;
		windDeg?: number;
		condition?: Condition;
		summary?: string;
		desc?: string;
		text?: string;
	};

	type WeatherRoot = {
		data?: any;
		current?: WeatherNow;
		now?: WeatherNow;
		forecast?: Day[];
		daily?: Day[];
		days?: Day[];
		astronomy?: {
			sunrise?: string | number;
			sunset?: string | number;
			moonrise?: string | number;
			moonset?: string | number;
		};
		sunrise?: string | number;
		sunset?: string | number;
		moonrise?: string | number;
		moonset?: string | number;
	};

	let wx: WeatherRoot | null = null;
	let interval: number | undefined;

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
		`/vendor/weather-icons/fill/svg/${iconSlugOf(code, main)}.svg`;
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
		} catch {}
	}

	onMount(() => {
		loadWeather();
		interval = window.setInterval(loadWeather, 3 * 60 * 1000);
		return () => interval && clearInterval(interval);
	});
</script>

{#if wx}
	<!-- Now block -->
	<div class="wx-now">
		<div class="wx-topline"></div>
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
			{@const iconUrl = iconUrlOf(
				now?.condition?.icon,
				now?.condition?.main || now?.condition?.desc
			)}
			{@const astro = (root.astronomy || (root as any).astro || {}) as any}
			{@const sunrise = astro.sunrise || (root as any).sunrise}
			{@const sunset = astro.sunset || (root as any).sunset}
			{@const moonrise = astro.moonrise || (root as any).moonrise}
			{@const moonset = astro.moonset || (root as any).moonset}

			<div class="wx-temp-main">
				<div class="wx-temp">
					<span
						>{tempF}{#if typeof tempF === 'number'}°F{/if}</span
					>
					<div class="wx-icon">
						<img class="wi wi-now" src={iconUrl} alt={summary} loading="lazy" />
					</div>
				</div>
				<div class="wx-feels-row">
					<div class="wx-feels">
						{typeof feelsF === 'number' ? `Feels like ${feelsF}°F` : summary}
					</div>
					{#if todayHiF !== undefined || todayLoF !== undefined}
						<span class="wx-hilow-now">
							<span class="hi">{todayHiF === undefined ? '—' : `${todayHiF}°F`}</span>
							<span class="lo">{todayLoF === undefined ? '—' : `${todayLoF}°F`}</span></span
						>
					{/if}
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
										src="/vendor/weather-icons/fill/svg/wind.svg"
										alt="Wind"
										loading="lazy"
									/></span
								>{windMphVal} mph{now?.windDeg !== undefined
									? ` ${windDir(now.windDeg)}`
									: ''}</span
							>
						{/if}
						{#if (now?.humidity ?? (now as any)?.rh) !== undefined}
							<span class="item humidity"
								><span class="ico"
									><img
										class="wi wi-stat"
										src="/vendor/weather-icons/fill/svg/humidity.svg"
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
						{#if sunrise}<span class="item sunrise"
								><span class="ico"
									><img
										class="wi wi-astro"
										src="/vendor/weather-icons/fill/svg/sunrise.svg"
										alt="Sunrise"
										loading="lazy"
									/></span
								>{hm(sunrise)}</span
							>{/if}
						{#if sunset}<span class="item sunset"
								><span class="ico"
									><img
										class="wi wi-astro"
										src="/vendor/weather-icons/fill/svg/sunset.svg"
										alt="Sunset"
										loading="lazy"
									/></span
								>{hm(sunset)}</span
							>{/if}
					</div>
					<div class="col moon">
						{#if moonrise}<span class="item moonrise"
								><span class="ico"
									><img
										class="wi wi-astro"
										src="/vendor/weather-icons/fill/svg/moonrise.svg"
										alt="Moonrise"
										loading="lazy"
									/></span
								>{hm(moonrise)}</span
							>{/if}
						{#if moonset}<span class="item moonset"
								><span class="ico"
									><img
										class="wi wi-astro"
										src="/vendor/weather-icons/fill/svg/moonset.svg"
										alt="Moonset"
										loading="lazy"
									/></span
								>{hm(moonset)}</span
							>{/if}
					</div>
				</div>
			</div>

			<!-- Forecast: next 7 days (skip today) -->
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
						{@const icoUrl = `/vendor/weather-icons/fill/svg/${slug}.svg`}
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
