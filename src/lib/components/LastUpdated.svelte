<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	type LastUpdatedProps = {
		timestamp: string | Date | null;
		className?: string;
	};

	let { timestamp = null, className = '' } = $props<LastUpdatedProps>();

	const FMT_TIME = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});

	const FMT_FULL_DATE = new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	let rel = $state('');
	let abs = $state('');
	let aria = $state('Update time unknown');
	let hasTs = $state(false);
	let timer: number | undefined;

	function toDate(input: string | Date | null | undefined): Date | null {
		if (!input) return null;
		if (input instanceof Date) {
			return Number.isNaN(input.getTime()) ? null : input;
		}
		const d = new Date(input);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	function formatRelative(ts: Date, now: Date): string {
		const diffMs = now.getTime() - ts.getTime();
		const diffSec = Math.round(diffMs / 1000);
		if (diffSec < 0) return 'just now';
		if (diffSec < 60) return 'just now';
		const diffMin = Math.round(diffSec / 60);
		if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
		const diffHr = Math.round(diffMin / 60);
		if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
		const diffDay = Math.round(diffHr / 24);
		return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
	}

	function recompute() {
		const dt = toDate(timestamp);
		if (!dt) {
			hasTs = false;
			rel = '';
			abs = '';
			aria = 'Update time unknown';
			return;
		}
		const now = new Date();
		hasTs = true;
		rel = formatRelative(dt, now);
		abs = FMT_TIME.format(dt);
		const datePart = FMT_FULL_DATE.format(dt);
		aria = `Updated at ${abs} on ${datePart}`;
	}

	$effect(() => {
		recompute();
	});

	onMount(() => {
		recompute();
		timer = window.setInterval(() => {
			recompute();
		}, 60 * 1000);
	});

	onDestroy(() => {
		if (timer) window.clearInterval(timer);
	});
</script>

<span class={`last-updated ${className}`.trim()} aria-label={aria}>
	{#if hasTs}
		<span class="last-updated-text">
			<span class="rel">Updated {rel}</span>
			<span class="sep"> @ </span>
			<span class="abs">{abs}</span>
		</span>
	{:else}
		<span class="last-updated-text unknown">Update time unknown</span>
	{/if}
</span>

<style>
	.last-updated {
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.75rem;
		justify-self: end;
		line-height: 1.2;

		& .sep {
			opacity: 0.7;
		}

		& .rel {
			font-weight: 400;
		}

		& .abs {
			opacity: 0.9;
		}

		& .unknown {
			opacity: 0.7;
		}
	}

	@media (prefers-color-scheme: light) {
		.last-updated {
			color: rgba(0, 0, 0, 0.7);
		}
	}

	.last-updated-text {
		white-space: nowrap;
	}
</style>
