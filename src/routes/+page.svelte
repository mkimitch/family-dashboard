<script lang="ts">
	import Calendar from '$lib/components/Calendar.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import SystemStatusStub from '$lib/components/SystemStatusStub.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

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
		{messageSubtitle}
		{messageTitle}
		schoolMenu={data.schoolMenu}
		weather={data.weather}
	/>

	<div class="cal" bind:this={calEl}>
		<Calendar />
	</div>

	<SystemStatusStub />
</main>
