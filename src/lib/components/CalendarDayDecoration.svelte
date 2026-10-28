<script lang="ts">
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import { useSolarLighting } from '$lib/solarLightingContext';
	import HalloweenPumpkins from './HalloweenPumpkins.svelte';
	import { getCalendarDecoration } from '$lib/calendarDecorations';

	let { date }: { date: Date } = $props();
	const decoration = $derived(getCalendarDecoration(date));
	const solarNight = useSolarLighting();
	let lightingPreview = $state<string | null>(null);
	const isNight = $derived(lightingPreview ? lightingPreview === 'night' : $solarNight);
	onMount(() => {
		if (!dev) return;
		const value = new URLSearchParams(window.location.search).get('calendarPreviewLighting');
		if (value === 'day' || value === 'night') lightingPreview = value;
	});
</script>

{#if decoration === 'halloween'}
	<div
		class="day-decoration"
		class:is-night={isNight}
		data-lighting={isNight ? 'night' : 'day'}
		data-decoration={decoration}
		aria-hidden="true"
	>
		<svg class="web" viewBox="0 0 100 100" fill="none" focusable="false">
			<g stroke="currentColor" stroke-width="0.8">
				<path d="M0 0 98 0M0 0 92 38M0 0 70 70M0 0 38 92M0 0 0 98" />
				<path
					d="M22 0Q18 4 20 8Q15 10 16 16Q10 15 8 20Q4 18 0 22M46 0Q37 9 42 17Q30 21 33 33Q21 30 17 42Q9 37 0 46M72 0Q59 13 66 27Q47 34 51 51Q34 47 27 66Q13 59 0 72M98 0Q80 18 90 37Q64 46 70 70Q46 64 37 90Q18 80 0 98"
				/>
			</g>
		</svg>
		<svg class="bats" viewBox="0 0 120 100" focusable="false">
			<g fill="currentColor">
				<path
					class="bat bat--near"
					d="M10 28Q22 26 29 14L32 22 36 21 39 13Q47 23 60 21L51 32Q44 29 40 37L35 34 30 40Q24 33 17 37Z"
				/>
				<path
					class="bat bat--far"
					d="M63 62Q72 60 78 52L80 58 84 58 86 51Q93 59 103 58L97 67Q91 65 87 71L83 69 79 74Q74 68 68 71Z"
				/>
			</g>
		</svg>
		<svg class="ghost" viewBox="0 0 64 80" focusable="false">
			<path
				d="M12 69V30C12 4 51 4 51 30V55Q51 66 59 69Q51 78 43 69Q35 79 27 70Q19 78 12 69Z"
				fill="#e4def2"
			/>
			<g fill="#393049">
				<ellipse cx="27" cy="34" rx="2.6" ry="4" />
				<ellipse cx="41" cy="34" rx="2.6" ry="4" />
				<path
					d="M30 44Q34 50 38 44"
					fill="none"
					stroke="#393049"
					stroke-linecap="round"
					stroke-width="2"
				/>
			</g>
		</svg>
		<div class="pumpkins"><HalloweenPumpkins {isNight} /></div>
	</div>
{/if}

<style>
	.day-decoration {
		--holiday-color: oklch(76.07% 0.14 59.7);
		--ghost-rise: -18px;
		--ghost-drift: 3px;
		--ghost-rock: 5deg;
		--ghost-duration: 4.5s;
		--bat-rock: 10deg;
		--bat-travel: -3px;
		--bat-near-duration: 7.3s;
		--bat-far-duration: 9.7s;
		--frame-day: 0.42;
		--frame-night: 0.85;
		--lighting-transition: 6s;

		background: linear-gradient(165deg, oklch(0.6194 0.1387 300.46 / 29.35%), transparent 48%, oklch(0.7414 0.1405 56.84 / 7%));
		inset: 0;
		overflow: clip;
		pointer-events: none;
		position: absolute;
		user-select: none;
		z-index: -1;

		&::before,
		&::after {
			border: 1px solid var(--holiday-color);
			border-radius: 2px;
			box-shadow:
				0 0 5px var(--holiday-color),
				inset 0 0 6px color-mix(in srgb, var(--holiday-color), transparent 81%);
			content: '';
			inset: 1px;
			opacity: var(--frame-day);
			position: absolute;
		}

		&::after {
			background: linear-gradient(
				180deg,
				transparent 40%,
				color-mix(in srgb, var(--holiday-color), transparent 95%)
			);
			box-shadow:
				0 0 7px var(--holiday-color),
				inset 0 0 12px color-mix(in srgb, var(--holiday-color), transparent 75%);
			opacity: 0;
			transition: opacity var(--lighting-transition) ease;
		}

		&.is-night::after {
			opacity: var(--frame-night);
		}

		& svg {
			display: block;
			height: auto;
			position: absolute;
		}
	}

	.web {
		color: oklch(82.55% 0.04 312.78);
		opacity: 0.22;
		right: 0;
		top: 0;
		transform: scaleX(-1);
		width: min(65%, 6rem);
	}

	.bats {
		color: oklch(71% 0.08 308.61);
		opacity: 0.32;
		right: 3%;
		top: 24%;
		width: min(80%, 7rem);
	}

	.ghost {
		bottom: 28%;
		left: 8%;
		opacity: 0.26;
		width: min(32%, 3rem);
	}

	.pumpkins {
		bottom: 0.15rem;
		position: absolute;
		right: 3%;
		width: min(92%, 9rem);
	}

	.bat {
		transform-box: fill-box;
		transform-origin: center;
	}

	/* Opt in to motion; reduced-motion retains the original static SVG artwork. */
	@media (prefers-reduced-motion: no-preference) {
		.ghost {
			animation: ghost-float var(--ghost-duration) ease-in-out infinite;
		}

		.bat--near {
			animation: bat-flutter var(--bat-near-duration) ease-in-out -2.1s infinite;
		}

		.bat--far {
			animation: bat-flutter var(--bat-far-duration) ease-in-out -6.4s infinite;
		}
	}

	@keyframes ghost-float {
		0%,
		100% {
			transform: translate(0, 0) rotate(calc(-1 * var(--ghost-rock)));
		}

		50% {
			transform: translate(var(--ghost-drift), var(--ghost-rise)) rotate(var(--ghost-rock));
		}
	}

	@keyframes bat-flutter {
		0%,
		46%,
		82%,
		100% {
			transform: translateY(0) rotate(0deg) scaleY(1);
		}

		54%,
		70% {
			transform: translateY(var(--bat-travel)) rotate(calc(-1 * var(--bat-rock))) scaleY(0.8);
		}

		62%,
		76% {
			transform: translateY(-1px) rotate(var(--bat-rock)) scaleY(1);
		}
	}

	@media (prefers-oklch(62.8% 0.26 29.23)uced-motion: reduce) {
		.day-decoration::after {
			transition: none;
		}
	}
</style>
