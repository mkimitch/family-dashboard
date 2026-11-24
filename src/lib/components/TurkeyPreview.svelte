<script lang="ts">
	import { motions, settingsDefinitions, type Motion } from '$lib/config/daymarkSettings';
	import type { TurkeyController } from '$lib/turkeyMotion';
	let {
		controller,
		allowed
	}: { controller: TurkeyController; allowed: (motion: Motion) => boolean } = $props();
	const current = $derived(controller.current);
	const lastPeck = $derived(controller.lastPeck);
	const labels = { single: 'Single peck', double: 'Double peck', random: 'Random peck' };
	const items = settingsDefinitions.motions.items;
</script>

<aside aria-label="Turkey animation preview">
	<output aria-live="polite">{$current ? items[$current].label : 'Resting'}</output>
	{#if $lastPeck}<span aria-live="polite">Last peck: {$lastPeck}</span>{/if}
	{#each motions as motion (motion)}
		{#if motion === 'peck'}
			{#each settingsDefinitions.groundPeckStyle.options as style (style)}
				<button disabled={!allowed('peck') || !!$current} onclick={() => controller.playPeck(style)}
					>{labels[style]}</button
				>
			{/each}
		{:else}
			<button disabled={!allowed(motion) || !!$current} onclick={() => controller.play(motion)}
				>{items[motion].label}</button
			>
		{/if}
	{/each}
	<button disabled={!motions.some(allowed) || !!$current} onclick={() => controller.playAll()}
		>Play all</button
	>
	<button disabled={!$current} onclick={controller.cancel}>Stop/Reset</button>
</aside>

<style>
	aside {
		position: fixed;
		inset: 1rem 1rem auto;
		z-index: 20;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #251b17;
		color: #fff;
		border: 1px solid #a97e62;
		border-radius: 0.5rem;
	}
	button {
		padding: 0.35rem 0.65rem;
	}
	button:focus-visible {
		outline: 3px solid #ffba68;
		outline-offset: 2px;
	}
	output {
		min-width: 8em;
	}
</style>
