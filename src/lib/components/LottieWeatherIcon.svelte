<script lang="ts">
	type Props = {
		src: string;
		loop?: boolean;
		autoplay?: boolean;
		className?: string;
		ariaLabel?: string;
	};

	let { src, loop = true, autoplay = true, className = '', ariaLabel = '' }: Props = $props();
	let container = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const target = container;
		const path = src;
		const options = { loop, autoplay };
		if (!target) return;

		let active = true;
		let dispose: (() => void) | undefined;
		void import('lottie-web').then(({ default: lottie }) => {
			if (!active) return;
			const animation = lottie.loadAnimation({
				container: target,
				renderer: 'svg',
				...options,
				path
			});
			dispose = () => animation.destroy();
		});
		return () => {
			active = false;
			dispose?.();
		};
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
