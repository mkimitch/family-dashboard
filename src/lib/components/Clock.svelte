<script lang="ts">
	import { onMount } from 'svelte';

	let now = $state(new Date());
	let timer: number | undefined;
	const props = $props<{ className?: string }>();
	const className = $derived(props.className ?? '');

	const FMT_DATE_PARTS = new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
	const FMT_TIME_PARTS = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
		hour12: true
	});

	const part = (parts: Intl.DateTimeFormatPart[], type: string): string =>
		parts.find((p) => p.type === type)?.value || '';

	const updateNow = () => {
		now = new Date();
	};

	onMount(() => {
		updateNow();
		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				updateNow();
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);
		timer = window.setInterval(updateNow, 1000);
		return () => {
			if (timer) window.clearInterval(timer);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	});

	const dparts = $derived(FMT_DATE_PARTS.formatToParts(now));
	const tparts = $derived(FMT_TIME_PARTS.formatToParts(now));
	const dow = $derived(part(dparts, 'weekday'));
	const month = $derived(part(dparts, 'month'));
	const day = $derived(part(dparts, 'day'));
	const year = $derived(part(dparts, 'year'));
	const hour = $derived(part(tparts, 'hour'));
	const minute = $derived(part(tparts, 'minute'));
	const second = $derived(part(tparts, 'second'));
	const ampm = $derived(part(tparts, 'dayPeriod'));
</script>

<time class={`clock ${className}`.trim()} aria-live="polite">
	<span class="time">
		<span class="hours">{hour}</span><span class="colon">:</span><span class="minutes"
			>{minute}</span
		>
		<span class="secamp"><span class="seconds">{second}</span><span class="ampm">{ampm}</span></span
		>
	</span>
	<span class="date"
		><span class="dow">{dow}</span><span class="comma">, </span> <span class="month">{month}</span>
		<span class="day">{day}</span><span class="comma">, </span>
		<span class="year">{year}</span></span
	>
</time>
