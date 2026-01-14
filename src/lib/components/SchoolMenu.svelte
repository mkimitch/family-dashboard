<script lang="ts">
	import { onMount } from 'svelte';
	import type { SchoolMenu } from '../../routes/+layout.server';

	const POLL_INTERVAL_MS = 90 * 60 * 1000; // 90 minutes
	const DAILY_POLL_HOUR = 10;
	const DAILY_POLL_MINUTE = 5;
	const TIMEZONE = 'America/Chicago';

	let { schoolMenu: initialMenu = null as SchoolMenu | null } = $props();
	let menu = $state<SchoolMenu | null>(initialMenu);

	async function fetchMenu() {
		try {
			const res = await fetch('/api/school-menu', { cache: 'no-store' });
			if (res.ok) {
				menu = await res.json();
			}
		} catch (e) {
			console.error('SchoolMenu fetch failed:', e);
		}
	}

	function getMsUntilDailyPoll(): number {
		const now = new Date();
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: TIMEZONE,
			hour: 'numeric',
			minute: 'numeric',
			weekday: 'short',
			hour12: false
		});
		const parts = formatter.formatToParts(now);
		const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
		const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
		const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';

		const isWeekday = !['Sat', 'Sun'].includes(weekday);
		if (!isWeekday) return -1;

		const targetMinutes = DAILY_POLL_HOUR * 60 + DAILY_POLL_MINUTE;
		const currentMinutes = hour * 60 + minute;
		const diffMinutes = targetMinutes - currentMinutes;

		if (diffMinutes <= 0) return -1; // Already past today's poll time
		return diffMinutes * 60 * 1000;
	}

	function formatMenuDate(dateStr: string): string {
		const d = new Date(dateStr + 'T12:00:00');
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const isToday = d.toDateString() === today.toDateString();
		const isTomorrow = d.toDateString() === tomorrow.toDateString();

		if (isToday) return 'Today';
		if (isTomorrow) return 'Tomorrow';
		return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
	}

	onMount(() => {
		// Regular 90-minute polling
		const intervalId = setInterval(fetchMenu, POLL_INTERVAL_MS);

		// Schedule daily 10:05 AM CT poll on weekdays
		let dailyTimeoutId: ReturnType<typeof setTimeout> | undefined;
		const scheduleDailyPoll = () => {
			const ms = getMsUntilDailyPoll();
			if (ms > 0) {
				dailyTimeoutId = setTimeout(() => {
					fetchMenu();
					// Re-check tomorrow (will be -1 until next weekday morning)
				}, ms);
			}
		};
		scheduleDailyPoll();

		return () => {
			clearInterval(intervalId);
			if (dailyTimeoutId) clearTimeout(dailyTimeoutId);
		};
	});
</script>

{#if menu?.vegetarian?.length || menu?.ambiguous?.length}
	<aside class="hero-lunch hero-card" aria-label="School Lunch">
		<div class="lunch-header">
			<img src="/svg/static/school-lunch-tray-2.svg" alt="" class="lunch-icon" />
			<div class="lunch-header-text">
				<span class="lunch-title">School Lunch Options</span>
				<span class="lunch-date">{formatMenuDate(menu.date)}</span>
			</div>
		</div>
		<ul class="lunch-items">
			{#each menu.vegetarian as item}
				<li class="lunch-chip">{item.name}</li>
			{/each}
			{#each menu.ambiguous as item}
				<li class="lunch-chip lunch-chip--maybe" title="May or may not be vegetarian">{item.name}</li>
			{/each}
		</ul>
	</aside>
{/if}

