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

	onMount(() => {
		const update = () => {
			const calGrid = document.querySelector('.cal-grid') as HTMLElement | null;
			const hero = document.querySelector('.hero') as HTMLElement | null;
			if (!calGrid && !hero) return;
			const calTop = calGrid ? calGrid.getBoundingClientRect().top : 0;
			const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
			const y = Math.round(Math.max(calTop, heroBottom) + 50);
			document.documentElement.style.setProperty(
				'--wp-height',
				`${Math.max(0, Math.min(window.innerHeight, y))}px`
			);
		};
		const ro = new ResizeObserver(() => update());
		const hero = document.querySelector('.hero') as HTMLElement | null;
		const cal = document.querySelector('.cal') as HTMLElement | null;
		if (hero) ro.observe(hero);
		if (cal) ro.observe(cal);
		window.addEventListener('resize', update);
		window.addEventListener('orientationchange', update);
		update();
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', update);
			window.removeEventListener('orientationchange', update);
		};
	});
</script>

<main class="board">
	<Hero {alerts} {messageTitle} {messageSubtitle} {countdowns} weather={data.weather} />
	<Calendar class="cal" />
	<SystemStatusStub />
</main>
