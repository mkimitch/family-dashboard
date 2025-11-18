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

	onMount(async () => {
		if (!container || typeof window === 'undefined') return;
		const { default: lottie } = await import('lottie-web');
		const anim = lottie.loadAnimation({
			container,
			renderer: 'svg',
			loop,
			autoplay,
			path: src
		});
		return () => {
			anim?.destroy();
		};
	});
</script>

<div
	bind:this={container}
	class={className}
	role={ariaLabel ? 'img' : undefined}
	aria-label={ariaLabel || undefined}
></div>
