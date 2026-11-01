<script lang="ts">
	import type { DiwaliIntensity } from '$lib/calendarDecorations';

	let {
		isNight,
		crowded = false,
		intensity
	}: { isNight: boolean; crowded?: boolean; intensity: DiwaliIntensity } = $props();

	const assets = [
		{ name: 'rangoli', file: 'diwali-rangoli-corners.svg' },
		{ name: 'lantern', file: 'diwali-lantern.svg' },
		{ name: 'diyas', file: 'diwali-diyas-row.svg' },
		{ name: 'sparkles', file: 'diwali-sparkles.svg' }
	];
</script>

<!-- Image documents isolate SVG IDs, keyframes and their built-in reduced-motion rules. -->
<div
	class="diwali-artwork"
	class:is-night={isNight}
	class:is-crowded={crowded}
	data-intensity={intensity}
>
	{#each assets as asset (asset.name)}
		{#if intensity === 'full' || asset.name === 'rangoli' || asset.name === 'diyas'}
			{@const base = `/assets/holidays/diwali/${asset.file}`}
			{@const staticSource = `${base}?motion=static#diwali-reduced-motion`}
			{@const source =
				intensity === 'full'
					? base
					: intensity === 'moderate' && asset.name === 'diyas'
						? `${base}?motion=moderate#diwali-moderate`
						: staticSource}
			<picture>
				<!-- Explicit SVG targets also work with Chromium's cached motion preferences. -->
				<source media="(prefers-reduced-motion: reduce)" srcset={staticSource} />
				<img class={asset.name} src={source} alt="" />
			</picture>
		{/if}
	{/each}
</div>

<style>
	.diwali-artwork {
		--diwali-light-opacity: 0.62;
		--diwali-sparkle-opacity: 0.3;
		--diwali-rangoli-opacity: 0.65;
		--diwali-diyas-height: 4.25rem;

		/* Size containment is on the absolute artwork only, never on calendar content. */
		container: diwali-artwork / size;
		inset: 0;
		overflow: clip;
		position: absolute;

		&.is-night {
			--diwali-light-opacity: 0.95;
			--diwali-sparkle-opacity: 0.6;
		}

		&[data-intensity='subtle'] {
			--diwali-light-opacity: 0.3;
			--diwali-rangoli-opacity: 0.22;
			--diwali-diyas-height: 2.5rem;

			&.is-night {
				--diwali-light-opacity: 0.45;
			}
		}

		&[data-intensity='moderate'] {
			--diwali-light-opacity: 0.46;
			--diwali-rangoli-opacity: 0.4;
			--diwali-diyas-height: 3.3rem;

			&.is-night {
				--diwali-light-opacity: 0.66;
			}
		}

		& > picture {
			display: contents;
		}

		& img {
			display: block;
			position: absolute;
			transition: opacity 6s ease;
		}
	}

	.rangoli {
		height: auto;
		left: 0;

		/* The date is at the upper left; soften that corner. */
		mask-image: linear-gradient(90deg, #0005, #000 65%);
		opacity: var(--diwali-rangoli-opacity);
		top: 0;
		width: 100%;
	}

	.lantern {
		height: min(38%, 7rem);
		left: 50%;
		opacity: var(--diwali-light-opacity);
		top: 0;
		transform: translateX(-50%);
		width: min(34%, 4.75rem);
	}

	.diyas {
		bottom: 0;
		height: min(24%, var(--diwali-diyas-height));
		left: 0;
		opacity: var(--diwali-light-opacity);
		width: 100%;
	}

	.sparkles {
		height: 100%;
		inset: 0;
		mask-image: linear-gradient(90deg, #000, transparent 35% 65%, #000);
		opacity: var(--diwali-sparkle-opacity);
		width: 100%;
	}

	.diwali-artwork.is-crowded {
		& .lantern,
		& .sparkles {
			display: none;
		}

		& .rangoli {
			opacity: calc(var(--diwali-rangoli-opacity) * 0.46);
		}

		& .diyas {
			height: min(18%, 2.5rem);
			opacity: calc(var(--diwali-light-opacity) * 0.6);
		}
	}

	@container diwali-artwork (max-height: 12rem) {
		.lantern {
			height: 30%;
			width: 25%;
		}

		.rangoli {
			opacity: calc(var(--diwali-rangoli-opacity) * 0.62);
		}

		.diwali-artwork .sparkles {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.diwali-artwork img {
			transition: none;
		}
	}
</style>
