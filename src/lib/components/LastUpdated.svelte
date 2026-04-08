<script lang="ts">
 	import { type ResolvedDateTimeDisplaySettings } from '$lib/config/dateTime';
 	import { toDate } from '$lib/utils/dateTime';
 	import { createDateTimeFormatter, getResolvedDateTimeDisplaySettings } from '$lib/utils/dateTimeContext';
 	import { onDestroy, onMount } from 'svelte';

	type LastUpdatedProps = {
		timestamp: string | Date | null;
		className?: string;
		dateTimeDisplay?: ResolvedDateTimeDisplaySettings | null;
	};

	let { timestamp = null, className = '', dateTimeDisplay = null }: LastUpdatedProps = $props();
	const dateTime = createDateTimeFormatter(() => getResolvedDateTimeDisplaySettings({ dateTimeDisplay }));

	let rel = $state('');
	let abs = $state('');
	let aria = $state('Update time unknown');
	let hasTs = $state(false);
	let timer: number | undefined;

	const recompute = () => {
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
		rel = dateTime.formatUpdatedAgo(dt, { now });
		abs = dateTime.formatTime(dt, { preset: 'statusTime' });
		const datePart = dateTime.formatDate(dt, { preset: 'statusDate' });
		aria = `Updated at ${abs} on ${datePart}`;
	};

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

		& .abs {
			opacity: 0.9;
		}

		& .last-updated-text {
			white-space: normal;
		}

		& .rel {
			font-weight: 400;
		}

		& .sep {
			opacity: 0.7;
		}

		& .unknown {
			opacity: 0.7;
		}
	}
</style>
