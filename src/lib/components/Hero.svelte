<script lang="ts">
	import type { CountdownItem } from '$lib/config/countdowns';
	import type { ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
	import type { SchoolMenu as SchoolMenuType } from '../../routes/+layout.server';
	import { onMount } from 'svelte';
	import Clock from './Clock.svelte';
	import CountdownList from './CountdownList.svelte';
	import SchoolMenu from './SchoolMenu.svelte';
	import WeatherCard from './WeatherCard.svelte';

	type HeroDensity = 'spacious' | 'compact';
	
	type HeroProps = {
		alerts?: string[];
		messageTitle?: string;
		messageSubtitle?: string;
		countdowns?: CountdownItem[];
		dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null;
		weather?: any;
		schoolMenu?: SchoolMenuType | null;
	};

	const COMPACT_HERO_MAX_HEIGHT = 385;

	let {
		alerts = [] as string[],
		messageTitle = '',
		messageSubtitle = '',
		countdowns = [] as CountdownItem[],
		dateTimeDisplay = null as ResolvedDateTimeDisplaySettings | null,
		weather = null,
		schoolMenu = null as SchoolMenuType | null
	}: HeroProps = $props();

	let heroEl = $state<HTMLElement | null>(null);
	let heroDensity = $state<HeroDensity>('spacious');
	let densityFrame = 0;

	const isCompact = $derived(heroDensity === 'compact');
	const heroClass = $derived(`hero hero--${heroDensity}`);
	const statusRailClass = $derived(`hero-status-rail ${isCompact ? 'hero-card' : ''}`.trim());
	const countdownClass = $derived(`hero-center ${isCompact ? '' : 'hero-card'}`.trim());
	const clockClass = $derived(`hero-clock ${isCompact ? '' : 'hero-card'}`.trim());
	const weatherClass = $derived(`hero-weather ${isCompact ? '' : 'hero-card'}`.trim());

	const updateHeroDensity = () => {
		cancelAnimationFrame(densityFrame);
		densityFrame = requestAnimationFrame(() => {
			if (!heroEl) return;
			const nextDensity =
				heroEl.getBoundingClientRect().height <= COMPACT_HERO_MAX_HEIGHT ? 'compact' : 'spacious';
			if (nextDensity !== heroDensity) {
				heroDensity = nextDensity;
			}
		});
	};

	onMount(() => {
		const ro = new ResizeObserver(updateHeroDensity);
		if (heroEl) {
			ro.observe(heroEl);
		}
		window.addEventListener('resize', updateHeroDensity);
		updateHeroDensity();

		return () => {
			cancelAnimationFrame(densityFrame);
			ro.disconnect();
			window.removeEventListener('resize', updateHeroDensity);
		};
	});
</script>

<header bind:this={heroEl} class={heroClass}>
	{#if messageTitle}
		<section class="hero-banner hero-card" aria-label="Message">
			<div class="hero-message-title">{messageTitle}</div>
			{#if messageSubtitle}
				<div class="hero-message-subtitle">{messageSubtitle}</div>
			{/if}
		</section>
	{/if}

	<section class={statusRailClass} aria-label="Current status">
		<section class={clockClass} aria-label="Current time">
			<Clock {dateTimeDisplay} density={heroDensity} />
		</section>
		<CountdownList
			className={countdownClass}
			density={heroDensity}
			items={countdowns}
			{dateTimeDisplay}
		/>
		<section class={weatherClass} aria-label="Weather">
			<WeatherCard {dateTimeDisplay} density={heroDensity} initialWeather={weather} />
		</section>
	</section>
	<SchoolMenu className="hero-lunch hero-card" {dateTimeDisplay} {schoolMenu} />
</header>

<style>
	.hero {
		align-items: start;
		container: hero / size;
		display: grid;
		gap: 1rem;
		grid-area: hero;
		grid-template-areas:
			'lunch banner weather'
			'lunch banner weather'
			'clock center weather';
		grid-template-columns:
			max-content
			minmax(0, 100%)
			max-content;
		grid-template-rows:
			auto
			minmax(0, 1fr)
			auto;
		min-height: 0;
		padding: 0.25rem 0.25rem 0;

		&.hero--compact {
			align-items: stretch;
			gap: 0.5rem;
			grid-template-areas:
				'status status status'
				'lunch banner banner';
			grid-template-rows:
				auto
				minmax(0, 1fr);
		}

		& .hero-status-rail {
			display: contents;
		}

		&.hero--compact .hero-status-rail {
			align-items: center;
			display: grid;
			gap: 0.75rem;
			grid-area: status;
			grid-template-columns: max-content minmax(0, 1fr) max-content;
			min-width: 0;
			width: 100%;
		}

		& .hero-banner {
			align-self: start;
			grid-area: banner;
			justify-self: center;
		}

		& .hero-message-title {
			font-size: clamp(1.25rem, 2.5vw, 1.75rem);
			font-weight: 800;
		}

		& .hero-message-subtitle {
			color: var(--muted);
			font-size: clamp(0.95rem, 1.6vw, 1.125rem);
		}

		& :global(.hero-card) {
			backdrop-filter: blur(0.3rem);
			background: color-mix(in oklch, var(--card), transparent 40%);
			background-image: linear-gradient(135deg, oklch(100% 0 0 / 0.06), transparent);
			border: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 85%);
			border-radius: var(--radius);
			box-shadow: 0 0.5rem 1.5rem color-mix(in oklch, var(--bg), transparent 60%);
			padding: 0.5rem;
		}

		& :global(.hero-center) {
			align-self: end;
			grid-area: center;
			justify-self: center;
		}

		&.hero--compact :global(.hero-center) {
			align-self: center;
			grid-area: auto;
			justify-self: stretch;
			min-width: 0;
		}

		& .hero-clock {
			align-self: end;
			grid-area: clock;
		}

		&.hero--compact .hero-clock {
			align-self: center;
			grid-area: auto;
			justify-self: start;
			min-width: 0;
		}

		& :global(.hero-lunch) {
			display: grid;
			grid-area: lunch;
			grid-template-columns: 1fr;
			width: 15rem;
		}

		&.hero--compact :global(.hero-lunch) {
			align-self: start;
			width: min(15rem, 100%);
		}

		& .hero-weather {
			align-self: end;
			grid-area: weather;
			justify-self: end;
		}

		&.hero--compact .hero-weather {
			align-self: center;
			grid-area: auto;
			justify-self: end;
			min-width: 0;
		}
	}
</style>
