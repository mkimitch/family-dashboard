<script lang="ts">
	import { dev } from '$app/environment';
	import { page } from '$app/state';
	import { mount, onMount, unmount } from 'svelte';
	import type { GroundPeckStyle, Motion, TurkeySettings } from '$lib/config/daymarkSettings';
	import { createTurkeyController, scheduleTurkey } from '$lib/turkeyMotion';
	import { animatePeck, restingNeckPath } from '$lib/turkeyPeck';
	import TurkeyPreview from './TurkeyPreview.svelte';

	let {
		simplified,
		settings,
		groundPeckStyle,
		motionAllowed
	}: {
		simplified: boolean;
		settings: TurkeySettings;
		groundPeckStyle: GroundPeckStyle;
		motionAllowed: boolean;
	} = $props();
	const uid = $props.id();
	let turkey: SVGSVGElement;
	let neck: SVGPathElement;
	let face: SVGGElement;
	let visible = $state(false);
	let reduce = $state(true);
	const manual = $derived(dev && page.url.searchParams.get('turkeyPreview') === 'manual');
	const allowed = (motion: Motion) =>
		visible && !reduce && motionAllowed && settings[motion].enabled;

	// Keyframes use CSS transforms on the existing SVG coordinate system.
	type RigidMotion = Exclude<Motion, 'peck'>;
	const poses: Record<RigidMotion, string[]> = {
		head: ['none', 'rotate(-6deg)', 'rotate(2deg)', 'none'],
		wattle: ['none', 'rotate(10deg)', 'rotate(-5deg)', 'none'],
		wing: ['none', 'rotate(4deg)', 'rotate(-1deg)', 'none'],
		tail: ['none', 'rotate(-3deg)', 'rotate(1deg)', 'none']
	};
	const animatePart = (motion: RigidMotion, delay = 0) => {
		const part = turkey.querySelector<SVGGraphicsElement>('.' + motion)!;
		const offsets = motion === 'tail' ? [0, 0.4, 0.7, 1] : undefined;
		return part.animate(
			poses[motion].map((transform, index) => ({
				transform,
				offset: offsets?.[index],
				easing: 'ease-in-out'
			})),
			{ id: 'turkey-' + motion, duration: settings[motion].durationMs, delay }
		);
	};
	const controller = createTurkeyController(
		allowed,
		(...[motion, variant]) => {
			const animations =
				motion === 'peck'
					? animatePeck(neck, face, settings.peck.durationMs, variant)
					: [animatePart(motion)];
			if ((motion === 'head' || motion === 'peck') && allowed('wattle')) {
				animations.push(animatePart('wattle', settings[motion].durationMs * 0.48));
			}
			return animations;
		},
		() => groundPeckStyle
	);

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			visible = document.visibilityState === 'visible';
			reduce = media.matches;
			if (!visible || reduce) controller.cancel();
		};
		sync();
		media.addEventListener('change', sync);
		document.addEventListener('visibilitychange', sync);
		return () => {
			visible = false;
			media.removeEventListener('change', sync);
			document.removeEventListener('visibilitychange', sync);
			controller.cancel();
		};
	});
	$effect(() => {
		const configuration = settings;
		if (!visible || reduce || !motionAllowed) return;
		if (manual) return controller.cancel;
		return scheduleTurkey(controller, configuration);
	});
	$effect(() => {
		if (!manual) return;
		const controls = mount(TurkeyPreview, {
			target: document.body,
			props: { controller, allowed }
		});
		return () => {
			void unmount(controls);
		};
	});
</script>

<div class="harvest" class:crowded={simplified} class:animate={motionAllowed && visible && !reduce}>
	<svg bind:this={turkey} class="turkey" viewBox="0 0 132 114" focusable="false">
		<defs>
			<radialGradient id={`${uid}-glow`}>
				<stop stop-color="#ff9e43" stop-opacity=".66" />
				<stop offset=".55" stop-color="#e17c3a" stop-opacity=".32" />
				<stop offset="1" stop-color="#c55730" stop-opacity="0" />
			</radialGradient>
			<linearGradient
				id={`${uid}-body`}
				gradientUnits="userSpaceOnUse"
				gradientTransform="translate(29 15.5) scale(83.4 86)"
				x2=".65"
				y2="1"
			>
				<stop stop-color="#d4834d" />
				<stop offset=".48" stop-color="#aa5330" />
				<stop offset="1" stop-color="#703421" />
			</linearGradient>
			<linearGradient id={`${uid}-copper`} x2=".78" y2="1">
				<stop stop-color="#eeac62" />
				<stop offset=".52" stop-color="#ce7840" />
				<stop offset="1" stop-color="#974326" />
			</linearGradient>
			<!-- Each folded feather shares a pivot behind the shoulder. -->
			<g id={`${uid}-feather`}>
				<path
					d="M51 70 Q43 49 39 19 L44 13 52 10 Q54 9 55 12 L58 29 Q57 49 51 70Z"
					fill="currentColor"
				/>
				<path d="M51 70 52 11 55 12 58 29 Q57 49 51 70Z" fill="#693324" opacity=".22" />
			</g>
		</defs>

		<g class="ambient" fill={`url(#${uid}-glow)`} opacity="var(--harvest-glow)">
			<ellipse cx="61" cy="62" rx="68" ry="61" />
			<ellipse cx="72" cy="111" rx="38" ry="8" opacity=".65" />
		</g>

		<g transform="translate(11 7) scale(.93)">
			<g class="tail">
				<use href={`#${uid}-feather`} transform="rotate(-108 51 70)" color="#a45b38" />
				<use href={`#${uid}-feather`} transform="rotate(-85 51 70)" color="#c87540" />
				<use href={`#${uid}-feather`} transform="rotate(-62 51 70)" color="#dc8c49" />
				<use href={`#${uid}-feather`} transform="rotate(-39 51 70)" color="#ecab57" />
				<use href={`#${uid}-feather`} transform="rotate(-16 51 70)" color="#c97744" />
			</g>
		</g>

		<!-- Far foot, near foot, then the breast overlapping both legs. -->
		<path d="m60 91 6 1 1 15 5 4 H60 l4-4Z" fill="#a96137" />
		<path d="m76 92 6-2 -1 14 3 4 9 3 H75 l3-4Z" fill="#d39149" />
		<path
			d="M29 72 Q32 55 47 48 Q62 40 78 46 L94 54 Q105 51 111 59 Q116 75 103 87
			L87 98 Q73 105 57 99 Q36 95 29 79Z"
			fill={`url(#${uid}-body)`}
		/>
		<g class="head">
			<path bind:this={neck} d={restingNeckPath} fill={`url(#${uid}-copper)`} />
			<g class="face" bind:this={face}>
				<path d="m110 22 10 7 -11-1Z" fill="#edb75e" />
				<path
					class="wattle"
					d="M109 28 Q108 33 111 38 Q113 43 109 44 Q103 43 105 35 Q106 31 109 28Z"
					fill="#b64e36"
				/>
				<circle cx="103" cy="23.5" r="2.1" fill="#402a22" />
			</g>
		</g>
		<!-- A broad lit wing folds over the darker flank. -->
		<g class="wing">
			<path
				d="M21 91 Q32 79 40 66 Q49 54 72 54 Q82 54 86 59
			L80 74 Q73 86 57 90 Q42 94 21 91Z"
				fill={`url(#${uid}-copper)`}
			/>
			<path d="M21 91 Q33 78 40 66 Q47 77 68 84 Q54 94 21 91Z" fill="#edab55" opacity=".55" />
		</g>
	</svg>

	<svg class="leaf maple" viewBox="-43 -43 86 86" focusable="false">
		<g id={`${uid}-maple`} transform="rotate(-32)">
			<ellipse rx="43" ry="38" fill={`url(#${uid}-glow)`} opacity="var(--harvest-glow)" />
			<path
				d="M0-33 6-20 11-23 9-5 19-16 21-11 32-14 29-3 34-2 17 9 20 14
				3 12 1 24 -1 24 0 12 -17 15 -15 9 -33-1 -28-4 -31-14 -20-11 -18-16 -8-5 -11-23 -5-20Z"
				fill={`url(#${uid}-copper)`}
			/>
			<path
				d="M0-33 1 11 9-5 11-23 6-20Z M1 11 32-14 29-3 34-2 17 9Z"
				fill="#8f452e"
				opacity=".46"
			/>
			<path d="M1 11 -31-14 -20-11Z M1 11 -18-16 -8-5Z" fill="#f5b86d" opacity=".45" />
			<path
				d="M0 24 1 11 0-26 M1 11 26-9 M1 11 -25-9"
				fill="none"
				stroke="#f7c087"
				stroke-width=".75"
				opacity=".65"
			/>
		</g>
	</svg>

	<svg class="leaf oak" viewBox="-32 -39 64 78" focusable="false">
		<g transform="rotate(30)">
			<ellipse rx="29" ry="36" fill={`url(#${uid}-glow)`} opacity="var(--harvest-glow)" />
			<path
				d="M0 23 Q-3 18 -12 13 Q-18 9 -14 7 Q-12 6 -8 8
				Q-6 8 -10 4 Q-22-5 -17-9 Q-15-11 -10-7 Q-6-4 -8-10
				Q-13-22 -8-22 Q-5-23 -2-16 Q0-12 0-19 Q0-29 4-29
				Q10-28 8-17 Q7-11 11-15 Q18-23 19-16 Q20-12 14-5
				Q9 1 15-2 Q23-6 21 1 Q20 5 12 9 Q7 12 11 12 Q16 11 15 15 Q13 19 2 23Z"
				fill={`url(#${uid}-copper)`}
			/>
			<path
				d="M4-28 Q5-5 1 22 Q13 18 15 15 Q16 11 11 12 Q7 12 12 9
				Q20 5 21 1 Q23-6 15-2 Q9 1 14-5 Q20-12 19-16 Q18-23 11-15 Q7-11 8-17 Q10-28 4-28Z"
				fill="#85442e"
				opacity=".35"
			/>
			<path
				d="M-1 33 Q4 10 4-24 M2 15 -10 10 M3 5 16-2 M4-2 -7-12"
				fill="none"
				stroke="#f6bc80"
				stroke-width="1"
				stroke-linecap="round"
				opacity=".75"
			/>
		</g>
	</svg>
	<svg class="leaf small-maple" viewBox="-43 -43 86 86" focusable="false">
		<use href={`#${uid}-maple`} transform="rotate(52)" />
	</svg>
</div>

<style>
	.harvest {
		--leaf-opacity: 0.68;

		container: harvest / size;
		inset: 0;
		position: absolute;
	}

	svg {
		height: auto;
		position: absolute;
	}

	.turkey {
		bottom: 1px;
		left: 3%;
		width: min(49%, 6rem, 29cqh);
	}

	.leaf {
		opacity: var(--leaf-opacity);
		overflow: visible;
		transform-origin: 50% 60%;
	}

	.oak {
		--period: 38s;
		--phase: -10s;

		top: 25%;
		right: 0;
		width: min(23%, 3rem, 17cqh);
	}

	.maple {
		--period: 47s;
		--phase: -33s;

		top: 63%;
		right: 3%;
		width: min(29%, 3.5rem, 20cqh);
	}

	.small-maple {
		--period: 54s;
		--phase: -25s;

		top: 45%;
		right: 14%;
		width: min(17%, 2rem, 12cqh);
		opacity: calc(var(--leaf-opacity) * 0.7);
	}

	.crowded {
		--leaf-opacity: 0.46;
		--fall-speed-factor: 1.55;

		& .small-maple {
			display: none;
		}

		& .turkey {
			opacity: 0.8;
		}
	}

	@container harvest (max-height: 12rem) {
		.leaf {
			opacity: calc(var(--leaf-opacity) * 0.65);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.animate .leaf {
			top: 0;
			animation: harvest-fall calc(var(--period) * var(--fall-speed-factor, 1)) linear
				calc(var(--phase) * var(--fall-speed-factor, 1)) infinite;
		}

		.animate .ambient {
			animation: harvest-glow 11s ease-in-out -4s infinite alternate;
		}
	}

	/* cqh follows the cell height. The leaf clears both edges before the loop resets. */
	@keyframes harvest-fall {
		from {
			transform: translateY(-125%) rotate(-6deg);
		}
		25% {
			transform: translate(-4px, calc(25cqh - 87.5%)) rotate(4deg);
		}
		50% {
			transform: translate(2px, calc(50cqh - 50%)) rotate(-4deg);
		}
		75% {
			transform: translate(-3px, calc(75cqh - 12.5%)) rotate(5deg);
		}
		to {
			transform: translateY(calc(100cqh + 25%)) rotate(-5deg);
		}
	}

	.head {
		transform-origin: 100px 67px;
	}
	.face {
		transform-origin: 102px 24px;
	}
	.wattle {
		transform-origin: 109px 28px;
	}
	.wing {
		transform-origin: 77px 60px;
	}
	.tail {
		transform-origin: 51px 70px;
	}

	@keyframes harvest-glow {
		from {
			opacity: calc(var(--harvest-glow) * 0.72);
		}
		to {
			opacity: var(--harvest-glow);
		}
	}
</style>
