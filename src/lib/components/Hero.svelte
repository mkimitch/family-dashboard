<script lang="ts">
	import Clock from './Clock.svelte';
	import WeatherCard from './WeatherCard.svelte';

	type Countdown = { label: string; value: string | number };
	let {
		alerts = [] as string[],
		messageTitle = '',
		messageSubtitle = '',
		countdowns = [] as Countdown[]
	} = $props();
</script>

<header class="hero">
	{#if alerts?.length}
		<div class="hero-alerts hero-card" aria-live="polite">
			{alerts.join('   •   ')}
		</div>
	{/if}

	<div class="hero-main">
		{#if messageTitle}
			<section class="hero-message hero-card" aria-label="Message">
				<div class="hero-message-title">{messageTitle}</div>
				{#if messageSubtitle}<div class="hero-message-subtitle">{messageSubtitle}</div>{/if}
			</section>
		{/if}

		{#if countdowns?.length}
			<aside class="hero-countdowns hero-card" role="group" aria-label="Countdowns">
				<ol class="countdown-list">
					{#each countdowns as c}
						<li>{c.value} — {c.label}</li>
					{/each}
				</ol>
			</aside>
		{/if}
	</div>

	<div class="hero-bottom">
		<section class="hero-clock hero-card" aria-label="Current time">
			<Clock />
		</section>
		<section class="hero-weather hero-card" aria-labelledby="wx-h">
			<WeatherCard />
		</section>
	</div>
</header>
