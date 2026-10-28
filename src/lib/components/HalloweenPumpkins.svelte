<script lang="ts">
	let { isNight = false }: { isNight?: boolean } = $props();
	const uid = $props.id();
</script>

<svg class="pumpkins" class:is-night={isNight} viewBox="0 0 160 95" focusable="false">
	<defs>
		<!-- Baseline #c4 radial gradient for ambient oklch(0.79 0.17 70.67) glow -->
		<radialGradient id={`${uid}-halo`}>
			<stop offset="0%" stop-color="oklch(0.75 0.14 61.66)" stop-opacity="0.6"></stop>
			<stop offset="100%" stop-color="oklch(0.75 0.14 61.66)" stop-opacity="0"></stop>
		</radialGradient>

		<!-- Warm incandescent candle core gradient inside cutouts -->
		<radialGradient id={`${uid}-core`} cx="50%" cy="78%" r="55%">
			<stop offset="0%" stop-color="oklch(1 0 0)" stop-opacity="0.9"></stop>
			<stop offset="45%" stop-color="oklch(0.95 0.09 97.81)" stop-opacity="0.6"></stop>
			<stop offset="100%" stop-color="oklch(0.75 0.14 61.66)" stop-opacity="0"></stop>
		</radialGradient>
	</defs>

	<!-- Ambient #c4 radial light spill behind and beneath the two gourds -->
	<g aria-hidden="true">
		<ellipse
			class="ambient-halo ambient-halo--large"
			cx="101"
			cy="54"
			rx="52"
			ry="40"
			fill={`url(#${uid}-halo)`}
		></ellipse>
		<ellipse
			class="ambient-halo ambient-halo--large"
			cx="101"
			cy="84"
			rx="40"
			ry="11"
			fill={`url(#${uid}-halo)`}
		></ellipse>
		<ellipse
			class="ambient-halo ambient-halo--small"
			cx="38.5"
			cy="65"
			rx="34"
			ry="27"
			fill={`url(#${uid}-halo)`}
		></ellipse>
		<ellipse
			class="ambient-halo ambient-halo--small"
			cx="38.5"
			cy="86"
			rx="26"
			ry="8"
			fill={`url(#${uid}-halo)`}
		></ellipse>
	</g>

	<!-- Large Right Pumpkin -->
	<g class="pumpkin pumpkin--large" transform="translate(66 6)">
		<path d="M35 25Q31 12 41 9" fill="none" stroke="oklch(0.66 0.06 122.78)" stroke-linecap="round" stroke-width="5"
		></path>
		<path d="M35 27C-8 10-9 77 22 77Q35 84 48 77C79 77 78 10 35 27Z" fill="oklch(0.6 0.12 53.21)"></path>
		<path
			class="ribs-large"
			d="M27 28Q12 51 26 76M44 28Q59 51 45 76"
			fill="none"
			stroke="oklch(0.74 0.12 64.69)"
			stroke-width="1.2"
			opacity="0.5"
		></path>

		<g class="lantern-illumination">
			<!-- Soft #c4 radial glow across the face (continuous across upper lip & tooth) -->
			<ellipse
				class="surface-glow--large"
				cx="35"
				cy="56"
				rx="33"
				ry="25"
				fill={`url(#${uid}-halo)`}
			></ellipse>

			<!-- Inner carved rind thickness glow -->
			<path
				class="inner-rind--large"
				d="M13 48 26 39 27 51ZM43 51 44 39 57 48ZM17 59Q24 63.7 31 64.7V68.5H37V64.9Q45 64.3 53 59Q48 77 35 72Q22 77 17 59Z"
				fill="none"
				stroke="oklch(0.67 0.15 55.48)"
				stroke-width="1.3"
				stroke-linejoin="round"
				transform="translate(0 -0.5)"
			></path>

			<!-- Subdivided .lantern-light cutout path with seamless upper tooth notch -->
			<g class="lantern-light" fill="oklch(0.89 0.1 77.35)">
				<path
					d="M13 48 26 39 27 51ZM43 51 44 39 57 48ZM17 59Q24 63.7 31 64.7V68.5H37V64.9Q45 64.3 53 59Q48 77 35 72Q22 77 17 59Z"
				></path>
			</g>

			<!-- Candle core highlight -->
			<path
				class="candle-core--large"
				d="M13 48 26 39 27 51ZM43 51 44 39 57 48ZM17 59Q24 63.7 31 64.7V68.5H37V64.9Q45 64.3 53 59Q48 77 35 72Q22 77 17 59Z"
				fill={`url(#${uid}-core)`}
			></path>

			<!-- Subtle 3-sided tooth rim highlight -->
			<path
				class="tooth-rim"
				d="M31 64.7V68.5H37V64.9"
				fill="none"
				stroke="oklch(0.94 0.07 89.6)"
				stroke-width="0.55"
				stroke-linecap="round"
				stroke-linejoin="round"
			></path>
		</g>
	</g>

	<!-- Small Left Pumpkin -->
	<g class="pumpkin pumpkin--small" transform="translate(15 34) scale(.67)">
		<path
			d="M35 25Q40 14 33 10"
			fill="none"
			stroke="oklch(0.66 0.06 122.78)"
			stroke-linecap="round"
			stroke-width="5"
		></path>
		<path d="M35 27C-8 10-9 77 22 77Q35 84 48 77C79 77 78 10 35 27Z" fill="oklch(0.67 0.12 56.57)"></path>
		<path
			class="ribs-small"
			d="M27 28Q12 51 26 76M44 28Q59 51 45 76"
			fill="none"
			stroke="oklch(0.79 0.12 67.53)"
			stroke-width="1.5"
			opacity="0.5"
		></path>

		<g class="lantern-illumination">
			<!-- Soft #c4 radial glow across the small pumpkin face -->
			<ellipse
				class="surface-glow--small"
				cx="35"
				cy="56"
				rx="33"
				ry="25"
				fill={`url(#${uid}-halo)`}
			></ellipse>

			<!-- Inner carved rind thickness glow -->
			<path
				class="inner-rind--small"
				d="M15 49 26 40 28 51ZM42 51 44 40 55 49ZM18 59Q35 68 52 59Q35 80 18 59Z"
				fill="none"
				stroke="oklch(0.71 0.14 59.56)"
				stroke-width="1.5"
				stroke-linejoin="round"
				transform="translate(0 -0.6)"
			></path>

			<!-- Baseline small cutout light -->
			<g class="lantern-light lantern-light--small" fill="oklch(0.9 0.09 81.53)">
				<path d="M15 49 26 40 28 51ZM42 51 44 40 55 49ZM18 59Q35 68 52 59Q35 80 18 59Z"></path>
			</g>

			<!-- Candle core highlight -->
			<path
				class="candle-core--small"
				d="M15 49 26 40 28 51ZM42 51 44 40 55 49ZM18 59Q35 68 52 59Q35 80 18 59Z"
				fill={`url(#${uid}-core)`}
			></path>
		</g>
	</g>
</svg>

<style>
	/* @property registrations are global; names are deliberately Daymark/Halloween-specific. */
	@property --daymark-halloween-candle-lg {
		inherits: true;
		initial-value: 1;
		syntax: '<number>';
	}

	@property --daymark-halloween-candle-sm {
		inherits: true;
		initial-value: 1;
		syntax: '<number>';
	}

	@property --daymark-halloween-sway-lg {
		inherits: true;
		initial-value: 0;
		syntax: '<length>';
	}

	@property --daymark-halloween-sway-sm {
		inherits: true;
		initial-value: 0;
		syntax: '<length>';
	}

	@property --daymark-halloween-face-level {
		inherits: true;
		initial-value: 1;
		syntax: '<number>';
	}

	@property --daymark-halloween-halo-multiplier {
		inherits: true;
		initial-value: 1;
		syntax: '<number>';
	}

	.pumpkins {
		--daymark-halloween-candle-lg: 1;
		--daymark-halloween-candle-sm: 1;
		--daymark-halloween-sway-lg: 0px;
		--daymark-halloween-sway-sm: 0px;
		--daymark-halloween-ember-color: oklch(0.75 0.14 61.66);
		--daymark-halloween-face-day: 0.72;
		--daymark-halloween-face-night: 1;
		--daymark-halloween-halo-day: 0.55;
		--daymark-halloween-halo-night: 1.05;
		--daymark-halloween-face-level: var(--daymark-halloween-face-day);
		--daymark-halloween-halo-multiplier: var(--daymark-halloween-halo-day);
		--daymark-halloween-lighting-duration: 6s;
		--daymark-halloween-flicker-large-duration: 3.7s;
		--daymark-halloween-flicker-small-duration: 5.3s;
		--daymark-halloween-sway-large-duration: 4.3s;
		--daymark-halloween-sway-small-duration: 6.1s;
		--daymark-halloween-shadow-alpha: 0.65;
		--daymark-halloween-lantern-fill-lg: color-mix(
			in oklch,
			oklch(0.98 0.04 93.82) calc((var(--daymark-halloween-candle-lg) - 0.72) * 185%),
			oklch(0.89 0.1 77.35)
		);
		--daymark-halloween-lantern-fill-sm: color-mix(
			in oklch,
			oklch(0.98 0.03 93.74) calc((var(--daymark-halloween-candle-sm) - 0.72) * 185%),
			oklch(0.9 0.09 81.53)
		);

		/* Preserve the prototype’s independent flicker and sway periods. */

		display: block;
		height: auto;
		overflow: visible;
		transition:
			--daymark-halloween-face-level var(--daymark-halloween-lighting-duration) ease,
			--daymark-halloween-halo-multiplier var(--daymark-halloween-lighting-duration) ease;
		width: 100%;

		&.is-night {
			--daymark-halloween-face-level: var(--daymark-halloween-face-night);
			--daymark-halloween-halo-multiplier: var(--daymark-halloween-halo-night);
		}

		& .pumpkin--large {
			--daymark-halloween-candle: var(--daymark-halloween-candle-lg);
		}

		& .pumpkin--small {
			--daymark-halloween-candle: var(--daymark-halloween-candle-sm);
		}

		/* Ambient #c4 radial glow behind the gourds + ground contact spill */
		& .ambient-halo {
			pointer-events: none;
			transform-box: fill-box;
			transform-origin: center;
		}

		& .ambient-halo--large {
			opacity: calc(
				0.82 * var(--daymark-halloween-candle-lg) * var(--daymark-halloween-halo-multiplier)
			);
			transform: translateX(var(--daymark-halloween-sway-lg))
				scale(calc(0.92 + (var(--daymark-halloween-candle-lg) - 0.85) * 0.45));
		}

		& .ambient-halo--small {
			opacity: calc(
				0.82 * var(--daymark-halloween-candle-sm) * var(--daymark-halloween-halo-multiplier)
			);
			transform: translateX(var(--daymark-halloween-sway-sm))
				scale(calc(0.92 + (var(--daymark-halloween-candle-sm) - 0.85) * 0.45));
		}

		/* Individual Pumpkin Gourd Groups */
		& .pumpkin {
			filter: drop-shadow(0 4px 5px rgba(10, 4, 15, var(--daymark-halloween-shadow-alpha)))
				drop-shadow(
					0 0 calc(4px * var(--daymark-halloween-candle) * var(--daymark-halloween-halo-multiplier))
						color-mix(in oklch, var(--daymark-halloween-ember-color) 34%, transparent)
				);
		}

		/* Subtle rib line subsurface warmth as internal candle flickers */
		& .ribs-large {
			opacity: calc(0.42 + var(--daymark-halloween-candle-lg) * 0.24);
		}

		& .ribs-small {
			opacity: calc(0.42 + var(--daymark-halloween-candle-sm) * 0.24);
		}

		/* Illumination group holding cutouts, inner rind bevels, and #c4 glow */
		& .lantern-illumination {
			isolation: isolate;
			opacity: var(--daymark-halloween-face-level);
		}

		/* Soft #c4 surface glow inside .lantern-illumination */
		& .surface-glow--large {
			mix-blend-mode: screen;
			opacity: calc(
				0.65 * var(--daymark-halloween-candle-lg) * var(--daymark-halloween-halo-multiplier)
			);
			pointer-events: none;
			transform: translateX(var(--daymark-halloween-sway-lg))
				scale(calc(0.94 + (var(--daymark-halloween-candle-lg) - 0.85) * 0.35));
			transform-box: fill-box;
			transform-origin: center;
		}

		& .surface-glow--small {
			mix-blend-mode: screen;
			opacity: calc(
				0.65 * var(--daymark-halloween-candle-sm) * var(--daymark-halloween-halo-multiplier)
			);
			pointer-events: none;
			transform: translateX(var(--daymark-halloween-sway-sm))
				scale(calc(0.94 + (var(--daymark-halloween-candle-sm) - 0.85) * 0.35));
			transform-box: fill-box;
			transform-origin: center;
		}

		/* Large Right Pumpkin Cutout Light (.lantern-light) */
		& .lantern-light:not(.lantern-light--small) {
			fill: oklch(0.89 0.1 77.35);
			filter: drop-shadow(0 0 0.85px oklch(0.99 0.02 99.59 / 0.94))
				drop-shadow(0 0 3.2px color-mix(in oklch, oklch(0.89 0.1 77.35) 86%, oklch(1 0 0)))
				drop-shadow(0 0 8.5px color-mix(in oklch, var(--daymark-halloween-ember-color) 82%, oklch(0.68 0.22 38.8)));
			opacity: calc(0.72 * var(--daymark-halloween-candle-lg));
		}

		/* Small Left Pumpkin Cutout Light (.lantern-light.lantern-light--small) */
		& .lantern-light.lantern-light--small {
			fill: oklch(0.9 0.09 81.53);
			filter: drop-shadow(0 0 1.05px oklch(1 0.01 102.01 / 0.95))
				drop-shadow(0 0 3.6px color-mix(in oklch, oklch(0.9 0.09 81.53) 88%, oklch(1 0 0)))
				drop-shadow(0 0 9.5px color-mix(in oklch, var(--daymark-halloween-ember-color) 84%, oklch(0.68 0.22 38.8)));
			opacity: calc(0.72 * var(--daymark-halloween-candle-sm));
		}

		/* 3D Carved Inner Rind Thickness Glow */
		& .inner-rind--large {
			opacity: calc(0.72 + var(--daymark-halloween-candle-lg) * 0.22);
			pointer-events: none;
		}

		& .inner-rind--small {
			opacity: calc(0.72 + var(--daymark-halloween-candle-sm) * 0.22);
			pointer-events: none;
		}

		/* Open 3-sided tooth rim highlight (wraps only the 3 hanging edges) */
		& .tooth-rim {
			opacity: calc(0.55 + var(--daymark-halloween-candle-lg) * 0.35);
			pointer-events: none;
		}

		/* Hot candle core highlight inside the carved cutouts */
		& .candle-core--large {
			opacity: calc(0.55 + (var(--daymark-halloween-candle-lg) - 0.8) * 1.4);
			pointer-events: none;
			transform: translateX(var(--daymark-halloween-sway-lg))
				scaleY(calc(0.92 + (var(--daymark-halloween-candle-lg) - 0.85) * 0.4));
			transform-box: fill-box;
			transform-origin: 50% 100%;
		}

		& .candle-core--small {
			opacity: calc(0.55 + (var(--daymark-halloween-candle-sm) - 0.8) * 1.4);
			pointer-events: none;
			transform: translateX(var(--daymark-halloween-sway-sm))
				scaleY(calc(0.92 + (var(--daymark-halloween-candle-sm) - 0.85) * 0.4));
			transform-box: fill-box;
			transform-origin: 50% 100%;
		}
	}

	/* Without modern color interpolation the SVG's fill attributes remain a warm static fallback. */
	@supports (color: color-mix(in oklch, oklch(1 0 231.14) 50%, oklch(0.79 0.17 70.67))) {
		.pumpkins .lantern-light:not(.lantern-light--small) {
			fill: var(--daymark-halloween-lantern-fill-lg);
		}

		.pumpkins .lantern-light.lantern-light--small {
			fill: var(--daymark-halloween-lantern-fill-sm);
		}

		@media (prefers-reduced-motion: no-preference) {
			.pumpkins {
				animation:
					flicker-large var(--daymark-halloween-flicker-large-duration)
						cubic-bezier(0.42, 0, 0.58, 1) infinite,
					flicker-small var(--daymark-halloween-flicker-small-duration)
						cubic-bezier(0.37, 0, 0.63, 1) infinite,
					sway-large var(--daymark-halloween-sway-large-duration) ease-in-out infinite,
					sway-small var(--daymark-halloween-sway-small-duration) ease-in-out infinite;
			}
		}
	}

	@media (prefers-oklch(62.8% 0.26 29.23)uced-motion: reduce) {
		.pumpkins {
			transition: none;
		}
	}

	@keyframes flicker-large {
		0%,
		100% {
			--daymark-halloween-candle-lg: 0.96;
		}

		13% {
			--daymark-halloween-candle-lg: 1.12;
		}

		27% {
			--daymark-halloween-candle-lg: 0.81;
		}

		41% {
			--daymark-halloween-candle-lg: 1.06;
		}

		53% {
			--daymark-halloween-candle-lg: 0.89;
		}

		67% {
			--daymark-halloween-candle-lg: 1.18;
		}

		79% {
			--daymark-halloween-candle-lg: 0.77;
		}

		91% {
			--daymark-halloween-candle-lg: 1.09;
		}
	}

	@keyframes flicker-small {
		0%,
		100% {
			--daymark-halloween-candle-sm: 0.92;
		}

		11% {
			--daymark-halloween-candle-sm: 0.78;
		}

		29% {
			--daymark-halloween-candle-sm: 1.15;
		}

		43% {
			--daymark-halloween-candle-sm: 0.86;
		}

		59% {
			--daymark-halloween-candle-sm: 1.11;
		}

		71% {
			--daymark-halloween-candle-sm: 0.75;
		}

		83% {
			--daymark-halloween-candle-sm: 1.19;
		}

		93% {
			--daymark-halloween-candle-sm: 0.95;
		}
	}

	@keyframes sway-large {
		0%,
		100% {
			--daymark-halloween-sway-lg: -0.45px;
		}

		33% {
			--daymark-halloween-sway-lg: 0.65px;
		}

		67% {
			--daymark-halloween-sway-lg: -0.7px;
		}

		88% {
			--daymark-halloween-sway-lg: 0.5px;
		}
	}

	@keyframes sway-small {
		0%,
		100% {
			--daymark-halloween-sway-sm: 0.55px;
		}

		28% {
			--daymark-halloween-sway-sm: -0.65px;
		}

		61% {
			--daymark-halloween-sway-sm: 0.75px;
		}

		85% {
			--daymark-halloween-sway-sm: -0.4px;
		}
	}
</style>
