<script lang="ts">
	import { createSnow } from '$lib/snow';
	import { onMount } from 'svelte';

	type Props = {
		enabled?: boolean;
	};

	let { enabled = true }: Props = $props();
	let canvas: HTMLCanvasElement | null = null;

	onMount(() => {
		if (!enabled) return;
		if (!canvas || typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		if (params.has('nosnow') || params.get('snow') === '0') return;
		const snow = createSnow(canvas);
		let ro: ResizeObserver | undefined;
		if (typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver(() => snow.resize());
			ro.observe(canvas);
		}
		snow.start();
		return () => {
			ro?.disconnect();
			snow.destroy();
		};
	});
</script>

<div class="snow-overlay" aria-hidden="true">
	<canvas bind:this={canvas} class="snow-canvas" aria-hidden="true"></canvas>
</div>

<style>
	.snow-overlay {
		height: var(--wp-height, 60vh);
		left: 0;
		overflow: hidden;
		pointer-events: none;
		position: fixed;
		right: 0;
		top: 0;
		z-index: 1;
	}

	.snow-canvas {
		display: block;
		height: 100%;
		width: 100%;
	}
</style>
