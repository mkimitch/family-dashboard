<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		src: string;
		loop?: boolean;
		autoplay?: boolean;
		className?: string;
		ariaLabel?: string;
	};

	let { src, loop = true, autoplay = true, className = '', ariaLabel = '' }: Props = $props();
	let container: HTMLDivElement | null = null;

	onMount(() => {
		let dispose: (() => void) | undefined;
		const load = async () => {
			if (!container || typeof window === 'undefined') return;
			const { default: lottie } = await import('lottie-web');
			const anim = lottie.loadAnimation({
				container,
				renderer: 'svg',
				loop,
				autoplay,
				path: src
			});
			dispose = () => anim?.destroy();
		};
		load();
		return () => dispose?.();
	});
</script>

<div
	bind:this={container}
	class="lottie-icon {className}"
	role={ariaLabel ? 'img' : undefined}
	aria-label={ariaLabel || undefined}
></div>

<style>
	.lottie-icon :global(svg) {
		display: block;
		height: 100%;
		width: 100%;
	}
</style>
