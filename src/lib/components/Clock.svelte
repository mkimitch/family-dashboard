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
		<span class="secamp">
			<span class="seconds">{second}</span>
			<span class="ampm">{ampm}</span>
		</span>
	</span>

	<span class="date">
		<span class="date-main">
			<span class="month">{month}</span>
			<span class="day">{day}</span>
		</span>

		<span class="date-meta">
			<span class="dow">{dow}</span>
			<span class="year">{year}</span>
		</span>
	</span>
</time>

<style>
	.clock {
		display: flex;
		flex-direction: column;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		gap: 0.4rem;
		line-height: 0.85;
		text-shadow: 0 0.125rem 0.75rem color-mix(in oklch, var(--bg), transparent 50%);

		.time {
			align-items: end;
			display: flex;
			font-size: clamp(2.5rem, 6vw, 5.25rem);
			font-weight: 700;
			gap: 0.1em;
			letter-spacing: 0.01em;
		}

		.secamp {
			align-items: center;
			display: flex;
			flex-wrap: wrap;
			height: 100%;
			line-height: 1;
			width: min-content;
		}

		.seconds {
			font-size: 0.38em;
			opacity: 0.72;
		}

		.ampm {
			font-size: 0.34em;
			letter-spacing: 0.05em;
			opacity: 0.82;
			text-transform: uppercase;
		}

		.date {
			align-items: end;
			display: flex;
			gap: 0.6rem;
			justify-content: space-between;

			.date-main {
				color: var(--fg);
				font-size: clamp(1.5rem, 2.8vw, 2.05rem);
				font-weight: 700;
				letter-spacing: -0.015em;
				line-height: 1;
			}

			.date-meta {
				align-items: end;
				display: flex;
				flex-direction: column;
				line-height: 0.95;
				text-align: right;
				transform: translateY(-0.02rem);
			}

			.dow {
				color: color-mix(in oklch, var(--fg), var(--muted) 80%);
				font-size: clamp(0.82rem, 1.15vw, 1rem);
				font-weight: 700;
				letter-spacing: 0.01em;
			}

			.year {
				color: color-mix(in oklch, var(--fg), var(--muted) 100%);
				font-size: clamp(0.68rem, 1.02vw, 0.9rem);
				font-weight: 700;
				letter-spacing: 0.015em;
				opacity: 0.9;
			}

			.day {
				font-variant-numeric: tabular-nums;
			}
		}
	}
</style>
