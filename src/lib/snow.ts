type SnowConfig = {
	dprCap: number
	drag: number
	glow: boolean
	gust: {amplitude: number; frequencyHz: number}
	layers: Array<{
		count: number
		gravity: number
		opacity: [number, number]
		sizePx: [number, number]
		wind: number
		windTurbulence: number
	}>
}

type Flake = {
	active: boolean
	ax: number
	ay: number
	layerIndex: number
	opacity: number
	phase: number
	r: number
	vx: number
	vy: number
	x: number
	y: number
}

const defaultConfig: SnowConfig = {
	dprCap: 2,
	drag: 0.98,
	glow: true,
	gust: {amplitude: 12, frequencyHz: 0.05},
	layers: [
		{count: 200, gravity: 22, opacity: [0.4, 0.7], sizePx: [1.0, 2.2], wind: 8, windTurbulence: 14},
		{count: 140, gravity: 38, opacity: [0.5, 0.85], sizePx: [2.0, 4.0], wind: 12, windTurbulence: 20},
		{count: 70, gravity: 60, opacity: [0.6, 1.0], sizePx: [3.5, 7.0], wind: 16, windTurbulence: 28},
	],
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rand = (a = 0, b = 1) => lerp(a, b, Math.random())

// Skew toward smaller values (lots of small flakes, few big)
const randPow = (a: number, b: number, p: number) => a + (b - a) * Math.pow(Math.random(), p)

export const createSnow = (canvas: HTMLCanvasElement, userConfig?: Partial<SnowConfig>) => {
	const cfg: SnowConfig = {
		...defaultConfig,
		...userConfig,
		gust: {...defaultConfig.gust, ...userConfig?.gust},
		layers: userConfig?.layers ?? defaultConfig.layers,
	}

	const ctx = canvas.getContext("2d")
	if (!ctx) throw new Error("2D canvas not supported")

	let raf = 0
	let lastT = performance.now()
	let w = 0
	let h = 0
	let dpr = 1

	const totalFlakes = cfg.layers.reduce((sum, l) => sum + l.count, 0)
	const flakes: Flake[] = Array.from({length: totalFlakes}, () => ({
		active: false,
		ax: 0,
		ay: 0,
		layerIndex: 0,
		opacity: 1,
		phase: rand(0, Math.PI * 2),
		r: 2,
		vx: 0,
		vy: 0,
		x: 0,
		y: 0,
	}))

	const spawn = (f: Flake, layerIndex: number) => {
		const layer = cfg.layers[layerIndex]
		f.active = true
		f.layerIndex = layerIndex

		f.r = randPow(layer.sizePx[0], layer.sizePx[1], 2.2)
		f.opacity = rand(layer.opacity[0], layer.opacity[1])

		// Initial velocity: slight randomness for natural variation
		const sizeRatio = f.r / layer.sizePx[1]
		f.vy = layer.gravity * (0.3 + sizeRatio * 0.4) * rand(0.8, 1.2)
		f.vx = layer.wind * rand(-0.3, 0.5)

		// Zero out acceleration
		f.ax = 0
		f.ay = 0

		f.phase = rand(0, Math.PI * 2)

		// Spawn slightly above, with horizontal padding for wind
		const padX = 100
		f.x = rand(-padX, w + padX)
		f.y = rand(-h * 0.2, -10)
	}

	const resize = () => {
		const rect = canvas.getBoundingClientRect()
		dpr = clamp(window.devicePixelRatio || 1, 1, cfg.dprCap)

		w = Math.floor(rect.width)
		h = Math.floor(rect.height)

		canvas.width = Math.floor(w * dpr)
		canvas.height = Math.floor(h * dpr)

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	}

	const tick = (t: number) => {
		const dt = clamp((t - lastT) / 1000, 0, 0.033)
		lastT = t

		// Clear canvas
		ctx.globalAlpha = 1
		ctx.clearRect(0, 0, w, h)

		// Additive blending for glow effect
		if (cfg.glow) {
			ctx.globalCompositeOperation = "lighter"
		}

		// Gust: multi-frequency wind for more organic feel
		const tSec = t * 0.001
		const gust1 = Math.sin(tSec * Math.PI * 2 * cfg.gust.frequencyHz) * cfg.gust.amplitude
		const gust2 = Math.sin(tSec * Math.PI * 2 * cfg.gust.frequencyHz * 2.3 + 1.2) * cfg.gust.amplitude * 0.4
		const gust = gust1 + gust2

		for (let i = 0, idx = 0; i < cfg.layers.length; i++) {
			const layer = cfg.layers[i]
			for (let j = 0; j < layer.count; j++, idx++) {
				const f = flakes[idx]
				if (!f.active) spawn(f, i)

				// Perlin-like turbulence from position
				const turbX = Math.sin(f.y * 0.008 + f.phase) + Math.cos(f.x * 0.006 - f.phase * 0.7)
				const turbY = Math.sin(f.x * 0.007 + f.phase * 1.3) * 0.3

				// Flutter: gentle lateral oscillation
				const flutter = Math.sin(f.phase + tSec * (1.5 + i * 0.4)) * (1.2 + f.r * 0.25)

				// Acceleration from wind/turbulence
				f.ax = (gust + flutter + turbX * layer.windTurbulence) * 0.8
				f.ay = layer.gravity + turbY * layer.windTurbulence * 0.3

				// Velocity integration with drag
				f.vx += f.ax * dt
				f.vy += f.ay * dt
				f.vx *= cfg.drag
				f.vy *= cfg.drag

				// Clamp max velocity
				f.vx = clamp(f.vx, -80, 80)
				f.vy = clamp(f.vy, 5, 120)

				// Position integration
				f.x += f.vx * dt
				f.y += f.vy * dt

				// Recycle if off-screen
				if (f.y > h + 20 || f.x < -150 || f.x > w + 150) {
					spawn(f, i)
				}

				// Draw flake with glow
				ctx.globalAlpha = f.opacity
				if (cfg.glow && f.r > 2) {
					// Soft radial gradient for larger flakes
					const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.5)
					grad.addColorStop(0, "rgba(255,255,255,1)")
					grad.addColorStop(0.4, "rgba(255,255,255,0.6)")
					grad.addColorStop(1, "rgba(255,255,255,0)")
					ctx.fillStyle = grad
				} else {
					ctx.fillStyle = "white"
				}
				ctx.beginPath()
				ctx.arc(f.x, f.y, cfg.glow && f.r > 2 ? f.r * 1.5 : f.r, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		// Reset composite operation
		ctx.globalCompositeOperation = "source-over"

		raf = requestAnimationFrame(tick)
	}

	const start = () => {
		resize()

		// Respect reduced motion (optional)
		const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
		if (prefersReduced) return

		// First-fill spawns
		let idx = 0
		for (let i = 0; i < cfg.layers.length; i++) {
			for (let j = 0; j < cfg.layers[i].count; j++, idx++) {
				spawn(flakes[idx], i)
				// Distribute vertically at start so it doesn't "rain in"
				flakes[idx].y = rand(-h * 0.2, h)
			}
		}

		lastT = performance.now()
		raf = requestAnimationFrame(tick)
	}

	const stop = () => {
		cancelAnimationFrame(raf)
	}

	window.addEventListener("resize", resize)

	return {
		config: cfg,
		resize,
		start,
		stop,
		destroy: () => {
			stop()
			window.removeEventListener("resize", resize)
		},
	}
}

/*

Example usage:

const canvas = document.querySelector("canvas#snow") as HTMLCanvasElement
const snow = createSnow(canvas, {
	glow: true,
	drag: 0.97,
	layers: [
		{count: 220, gravity: 24, opacity: [0.5, 0.8], sizePx: [1.0, 2.5], wind: 10, windTurbulence: 16},
		{count: 150, gravity: 40, opacity: [0.6, 0.9], sizePx: [2.2, 4.5], wind: 14, windTurbulence: 22},
		{count: 80, gravity: 65, opacity: [0.7, 1.0], sizePx: [4.0, 8.0], wind: 18, windTurbulence: 30},
	],
})
snow.start()

*/
