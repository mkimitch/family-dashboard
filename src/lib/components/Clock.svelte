<script lang="ts">
	import { onMount } from 'svelte';

	let now = new Date();
	let timer: number | undefined;
	export let className: string = '';

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

	onMount(() => {
		timer = window.setInterval(() => (now = new Date()), 1000);
		return () => {
			if (timer) window.clearInterval(timer);
		};
	});

	$: dparts = FMT_DATE_PARTS.formatToParts(now);
	$: tparts = FMT_TIME_PARTS.formatToParts(now);
	$: dow = part(dparts, 'weekday');
	$: month = part(dparts, 'month');
	$: day = part(dparts, 'day');
	$: year = part(dparts, 'year');
	$: hour = part(tparts, 'hour');
	$: minute = part(tparts, 'minute');
	$: second = part(tparts, 'second');
	$: ampm = part(tparts, 'dayPeriod');
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
