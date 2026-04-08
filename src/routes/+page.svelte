<script lang="ts">
	import Calendar from '$lib/components/Calendar.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import SystemStatusStub from '$lib/components/SystemStatusStub.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	type PageProps = { data: PageData };
	let { data }: PageProps = $props();

	const alerts: string[] = [];
	const messageTitle = '';
	const messageSubtitle = '';
	const countdowns: { label: string; value: string | number }[] = [];

	let calEl: HTMLElement | null = null;
	let raf = 0;

	onMount(() => {
		const heroEl = document.querySelector('.hero') as HTMLElement | null;
		const calGridEl = document.querySelector('.cal-grid') as HTMLElement | null;

		const updateWallpaperHeight = () => {
			cancelAnimationFrame(raf);

			raf = requestAnimationFrame(() => {
				const calTop = calGridEl?.getBoundingClientRect().top ?? 0;
				const heroBottom = heroEl?.getBoundingClientRect().bottom ?? 0;

				const y = Math.round(Math.max(calTop, heroBottom) + 50);

				document.documentElement.style.setProperty(
					'--wp-height',
					`${Math.max(0, Math.min(window.innerHeight, y))}px`
				);
			});
		};

		const ro = new ResizeObserver(updateWallpaperHeight);

		if (heroEl) {
			ro.observe(heroEl);
		}

		if (calEl) {
			ro.observe(calEl);
		}

		if (calGridEl) {
			ro.observe(calGridEl);
		}

		window.addEventListener('resize', updateWallpaperHeight);
		window.addEventListener('orientationchange', updateWallpaperHeight);

		updateWallpaperHeight();

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			window.removeEventListener('resize', updateWallpaperHeight);
			window.removeEventListener('orientationchange', updateWallpaperHeight);
		};
	});
</script>

<main class="board">
	<Hero
		{alerts}
		{countdowns}
		dateTimeDisplay={data.dateTimeDisplay}
		{messageSubtitle}
		{messageTitle}
		schoolMenu={data.schoolMenu}
		weather={data.weather}
	/>

	<div class="cal" bind:this={calEl}>
		<Calendar dateTimeDisplay={data.dateTimeDisplay} />
	</div>

	<SystemStatusStub dateTimeDisplay={data.dateTimeDisplay} />
</main>

<style>
	.board {
		display: grid;
		gap: 0.25rem;
		grid-template-areas: 'hero' 'cal' 'sys';
		grid-template-columns: 1fr;
		grid-template-rows: 1fr auto max-content;
		margin-inline: auto;
		min-height: 100vh;
		padding: 0;
		width: 100%;
	}

	.cal {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		grid-area: cal;
		min-height: 0;
	}

	@media (orientation: landscape) and (width >= 1100px) {
		.board {
			gap: 0.25rem;
			grid-template-areas: 'hero cal' 'sys sys';
			grid-template-columns: minmax(22rem, 0.9fr) minmax(28rem, 1.1fr);
			grid-template-rows: 1fr max-content;
			padding: 0.5rem 0.5rem 41px;
		}

		.cal {
			align-self: end;
			height: max-content;
		}
	}
</style>
