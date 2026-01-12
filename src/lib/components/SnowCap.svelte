<script lang="ts">
	export let bleedPx = 6
	export let capHeightPx = 34
	export let cornerRadiusPx = 14
	export let seed = 1337
	export let shadeAlpha = 0.18
	export let className = ""

	const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t

	const mulberry32 = (s: number) => {
		let a = s >>> 0
		return () => {
			a |= 0
			a = (a + 0x6D2B79F5) | 0
			let t = Math.imul(a ^ (a >>> 15), 1 | a)
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296
		}
	}

	const makeWavePath = (opts: {bumps: number; height: number; seed: number; width: number}) => {
		const {bumps, height, seed, width} = opts
		const r = mulberry32(seed)

		const top = height * 0.20
		const base = height * 0.95
		const dx = width / bumps

		let d = `M 0 ${base} L 0 ${top} `

		for (let i = 0; i <= bumps; i++) {
			const x = i * dx
			const y = top + (r() - 0.5) * height * 0.55
			const cx = x - dx / 2
			const cy = top + (r() - 0.5) * height * 0.25
			d += `Q ${cx} ${cy} ${x} ${y} `
		}

		d += `L ${width} ${base} Z`
		return d
	}

	const viewW = 600
	const viewH = 120

	// Svelte: reactive values (recompute when inputs change)
	$: bumps = Math.max(6, Math.round(capHeightPx / 6))
	$: pathD = makeWavePath({bumps, height: viewH, seed, width: viewW})

	// Unique gradient id per instance
	const uid = `snowcap-${Math.random().toString(36).slice(2)}`
</script>

<div
	class={`snowcap ${className}`}
	style={`
		--snowcap-height:${capHeightPx}px;
		--snowcap-bleed:${bleedPx}px;
		--snowcap-radius:${cornerRadiusPx}px;
	`}
>
	<div class="cap" aria-hidden="true">
		<svg preserveAspectRatio="none" viewBox={`0 0 ${viewW} ${viewH}`}>
			<defs>
				<linearGradient id={`${uid}-shade`} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color={`rgba(0,0,0,${clamp(shadeAlpha, 0, 0.5)})`} />
					<stop offset="60%" stop-color="rgba(0,0,0,0)" />
				</linearGradient>
			</defs>

			<path d={pathD} fill="var(--snow-color, #fff)" />
			<path d={pathD} fill={`url(#${uid}-shade)`} />
		</svg>
	</div>

	<div class="content">
		<slot />
	</div>
</div>

<style>
	.snowcap{
		position: relative;
	}

	.cap{
		border-top-left-radius: var(--snowcap-radius);
		border-top-right-radius: var(--snowcap-radius);
		filter: drop-shadow(0 2px 2px rgba(0,0,0,0.10));
		height: var(--snowcap-height);
		left: calc(-1 * var(--snowcap-bleed));
		overflow: hidden;
		pointer-events: none;
		position: absolute;
		right: calc(-1 * var(--snowcap-bleed));
		top: calc(-1 * var(--snowcap-height) + 1px);
	}

	svg{
		display: block;
		height: 100%;
		width: 100%;
	}

	.content{
		border-radius: var(--snowcap-radius);
		overflow: hidden;
		position: relative;
	}
</style>
