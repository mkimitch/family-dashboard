<script lang="ts">
	import type { SchoolMenu as SchoolMenuType } from '../../routes/+layout.server';
	import Clock from './Clock.svelte';
	import SchoolMenu from './SchoolMenu.svelte';
	import WeatherCard from './WeatherCard.svelte';

	type Countdown = { label: string; value: string | number };
	let {
		alerts = [] as string[],
		messageTitle = '',
		messageSubtitle = '',
		countdowns = [] as Countdown[],
		weather = null,
		schoolMenu = null as SchoolMenuType | null
	} = $props();
</script>

<header class="hero">
	{#if messageTitle}
		<section class="hero-banner hero-card" aria-label="Message">
			<div class="hero-message-title">{messageTitle}</div>
			{#if messageSubtitle}
				<div class="hero-message-subtitle">{messageSubtitle}</div>
			{/if}
		</section>
	{/if}

	{#if countdowns?.length}
		<aside class="hero-center hero-card" role="group" aria-label="Countdowns">
			<ol class="countdown-list">
				{#each countdowns as c}
					<li>{c.value} - {c.label}</li>
				{/each}
			</ol>
		</aside>
	{/if}

	<div class="hero-lunch hero-card">
		<SchoolMenu {schoolMenu} />
	</div>
	<section class="hero-clock hero-card" aria-label="Current time">
		<Clock />
	</section>
	<section class="hero-weather hero-card" aria-labelledby="wx-h">
		<WeatherCard initialWeather={weather} />
	</section>
</header>

<style>
	.hero {
		align-items: start;
		display: grid;
		gap: 1rem;
		grid-template-areas:
			'lunch banner weather'
			'.     .      weather'
			'clock center weather';
		grid-template-columns:
			max-content
			minmax(0, 1fr)
			clamp(22rem, 28vw, 30rem);
		grid-template-rows:
			auto
			minmax(0, 1fr)
			auto;

		.hero-lunch {
			grid-area: lunch;
		}

		.hero-banner {
			align-self: start;
			grid-area: banner;
			justify-self: center;
		}

		.hero-clock {
			align-self: end;
			grid-area: clock;
		}

		.hero-center {
			align-self: end;
			grid-area: center;
			justify-self: center;
		}

		.hero-weather {
			align-self: end;
			grid-area: weather;
			justify-self: end;
		}

		.hero-card {
			backdrop-filter: blur(0.3rem);
			background: color-mix(in oklch, var(--card), transparent 40%);
			background-image: linear-gradient(135deg, oklch(100% 0 0 / 0.06), transparent);
			border-radius: var(--radius);
			border: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 85%);
			box-shadow: 0 0.5rem 1.5rem color-mix(in oklch, var(--bg), transparent 60%);
			padding: 0.5rem;
		}
	}
</style>
