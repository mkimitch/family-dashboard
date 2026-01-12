<script lang="ts">
	import type { SchoolMenu } from '../../routes/+layout.server';

	let { schoolMenu = null as SchoolMenu | null } = $props();

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
</script>

{#if schoolMenu?.vegetarian?.length || schoolMenu?.ambiguous?.length}
	<aside class="hero-lunch hero-card" aria-label="School Lunch">
		<div class="lunch-header">
			<img src="/svg/static/school-lunch-tray-2.svg" alt="" class="lunch-icon" />
			<div class="lunch-header-text">
				<span class="lunch-title">School Lunch Options</span>
				<span class="lunch-date">{formatMenuDate(schoolMenu.date)}</span>
			</div>
		</div>
		<ul class="lunch-items">
			{#each schoolMenu.vegetarian as item}
				<li class="lunch-chip">{item.name}</li>
			{/each}
			{#each schoolMenu.ambiguous as item}
				<li class="lunch-chip lunch-chip--maybe" title="May or may not be vegetarian">{item.name}</li>
			{/each}
		</ul>
	</aside>
{/if}

