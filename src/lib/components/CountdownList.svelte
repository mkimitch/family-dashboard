<script lang="ts">
	import type { CountdownItem } from '$lib/config/countdowns';
	import type { ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
	import { resolveCountdownItems, toCountdownDateTimeAttr } from '$lib/utils/countdowns';
	import { onMount } from 'svelte';

	const MINUTE_MS = 60 * 1000;

	let now = $state(new Date());
	let refreshTimer: number | undefined;
	const props = $props<{
		className?: string;
		items?: CountdownItem[];
		dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null;
	}>();
	const className = $derived(props.className ?? '');
	const resolvedItems = $derived(
		resolveCountdownItems(props.items, {
			now,
			dateTimeDisplay: props.dateTimeDisplay
		})
	);

	const updateNow = () => {
		now = new Date();
	};

	const clearRefreshTimer = () => {
		if (refreshTimer !== undefined) {
			window.clearTimeout(refreshTimer);
			refreshTimer = undefined;
		}
	};

	const scheduleRefresh = () => {
		clearRefreshTimer();
		const delay = Math.max(1000, MINUTE_MS - (Date.now() % MINUTE_MS) + 25);
		refreshTimer = window.setTimeout(() => {
			updateNow();
			scheduleRefresh();
		}, delay);
	};

	onMount(() => {
		updateNow();
		scheduleRefresh();

		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				updateNow();
				scheduleRefresh();
			}
		};

		document.addEventListener('visibilitychange', handleVisibility);
		return () => {
			clearRefreshTimer();
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	});
</script>

{#if resolvedItems.length}
	<aside class={`countdowns ${className}`.trim()} role="group" aria-label="Countdowns">
		<ol class="countdowns__list">
			{#each resolvedItems as item (item.id)}
				<li
					class={`countdowns__item countdowns__item--${item.variant}`}
					aria-label={`${item.label}: ${item.remainingText}`}
				>
					<span class="countdowns__label">{item.label}</span>
					<time class="countdowns__value" datetime={toCountdownDateTimeAttr(item)}>
						{item.remainingText}
					</time>
				</li>
			{/each}
		</ol>
	</aside>
{/if}

<style>
	.countdowns {
		max-width: 100%;
		min-width: min(100%, 18rem);

		& .countdowns__list {
			display: grid;
			gap: 0.35rem;
			list-style: none;
			margin: 0;
			padding: 0.125rem;
		}

		& .countdowns__item {
			align-items: baseline;
			background: color-mix(in oklch, var(--card), transparent 28%);
			border: 0.0625rem solid color-mix(in oklch, var(--fg), transparent 88%);
			border-radius: calc(var(--radius) - 0.25rem);
			display: grid;
			font-variant-numeric: tabular-nums;
			gap: 0.75rem;
			grid-template-columns: minmax(0, 1fr) auto;
			padding: 0.42rem 0.55rem;
		}

		& .countdowns__item--subtle {
			background: color-mix(in oklch, var(--card), transparent 34%);
		}

		& .countdowns__item--accent {
			border-color: color-mix(in oklch, var(--fg), transparent 80%);
			box-shadow: inset 0 0 0 0.0625rem color-mix(in oklch, var(--fg), transparent 94%);
		}

		& .countdowns__label {
			color: color-mix(in oklch, var(--fg), var(--muted) 72%);
			font-size: 0.78rem;
			font-weight: 700;
			letter-spacing: 0.02em;
			line-height: 1.2;
			min-width: 0;
		}

		& .countdowns__value {
			align-self: center;
			color: var(--fg);
			font-size: 0.98rem;
			font-weight: 800;
			letter-spacing: 0.01em;
			line-height: 1;
			text-align: right;
			text-shadow: 0 0.125rem 0.75rem color-mix(in oklch, var(--bg), transparent 55%);
			white-space: nowrap;
		}
	}
</style>
