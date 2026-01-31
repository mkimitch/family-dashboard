<script lang="ts">
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';

	type Load = { '1m': number; '5m': number; '15m': number };
	type Mem = { totalMB: number; usedMB: number; freeMB: number };
	type SysInfo = {
		ipv4?: string | null;
		cpuTempC?: number | null;
		gpuTempC?: number | null;
		cpuCount?: number | null;
		load?: Load | null;
		uptimeSec?: number | null;
		mem?: Mem | null;
	};

	// Provide deterministic display metrics while developing without the Raspberry Pi endpoint.
	const MOCK_PI: SysInfo = {
		ipv4: '192.168.1.100',
		cpuTempC: 75,
		gpuTempC: 75,
		cpuCount: 4,
		load: { '1m': 1.69, '5m': 1.00, '15m': 4.00 },
		uptimeSec: 60 * 79 * 11 * 7 * 20,
		mem: { totalMB: 8192, usedMB: 4096, freeMB: 4096 }
	};

	// Refresh both endpoints every 15s to keep the dashboard metrics current without overloading the Pi.
	const POLL_INTERVAL_MS = 15000;

	let pi: SysInfo | null = null;
	let server: SysInfo | null = null;
	let interval: number | undefined;

	const clamp = (min: number, n: number, max: number): number =>
		Math.min(max, Math.max(min, n));

	type Tone = 'ok' | 'warn' | 'hot' | 'info';

	const toneForPct = (
		pct: number,
		thresholds: { hot?: number; warn?: number } = {}
	): Tone => {
		const { hot = 90, warn = 75 } = thresholds;
		if (pct >= hot) return 'hot';
		if (pct >= warn) return 'warn';
		return 'ok';
	};

	const toneForTemp = (
		c: number,
		thresholds: { hot?: number; warn?: number } = {}
	): Tone => {
		const { hot = 80, warn = 70 } = thresholds;
		if (c >= hot) return 'hot';
		if (c >= warn) return 'warn';
		return 'ok';
	};

	const formatBytes = (bytes: number): string => {
		if (!Number.isFinite(bytes)) return '';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
		let i = 0;
		let n = bytes;
		while (n >= 1024 && i < units.length - 1) {
			n /= 1024;
			i += 1;
		}
		const decimals = i === 0 ? 0 : n < 10 ? 1 : 0;
		return `${n.toFixed(decimals)}${units[i]}`;
	};

	const padNum = (n: number): string => (n < 10 ? ` ${n}` : `${n}`);

	const formatUptime = (sec: number | null | undefined): string => {
		if (sec == null || !Number.isFinite(sec)) return '';
		const s = Math.floor(sec);
		const days = Math.floor(s / 86400);
		const hours = Math.floor((s % 86400) / 3600);
		const minutes = Math.floor((s % 3600) / 60);
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	};

	const formatLoad = (load: Load | null | undefined, cpuCount?: number | null): string => {
		if (!load) return '';
		const raw = load['1m'];
		if (cpuCount && cpuCount > 0) {
			const pct = Math.min(999, Math.round((raw / cpuCount) * 100));
			return `${raw.toFixed(2)} (${pct}% of ${cpuCount}c)`;
		}
		return raw.toFixed(2);
	};

	const formatMem = (mem: Mem | null | undefined): string => {
		if (!mem) return '';
		const usedBytes = mem.usedMB * 1024 * 1024;
		const totalBytes = mem.totalMB * 1024 * 1024;
		return `${formatBytes(usedBytes)}/${formatBytes(totalBytes)}`;
	};

	const memPercent = (mem: Mem | null | undefined): number | null => {
		if (!mem || !Number.isFinite(mem.totalMB) || mem.totalMB <= 0) return null;
		return clamp(0, Math.round((mem.usedMB / mem.totalMB) * 100), 100);
	};

	const fetchPi = async () => {
		if (dev) pi = MOCK_PI;
		else {
		try {
			const r = await fetch('http://127.0.0.1:9000/sysinfo', { cache: 'no-store' });
			if (!r.ok) {
				if (dev) pi = MOCK_PI;
				return;
			}
			const data = (await r.json()) as SysInfo;
			const hasData =
				!!data &&
				(data.ipv4 != null ||
					data.cpuTempC != null ||
					data.gpuTempC != null ||
					data.load != null ||
					data.mem != null ||
					data.uptimeSec != null);
			pi = hasData ? data : dev ? MOCK_PI : null;
		} catch {
			pi = dev ? MOCK_PI : null;
		}
		}
	};

	const fetchServer = async () => {
		try {
			const r = await fetch('/api/server-sysinfo', { cache: 'no-store' });
			if (!r.ok) return;
			server = (await r.json()) as SysInfo;
		} catch {
			server = null;
		}
	};

	onMount(() => {
		if (typeof window === 'undefined') return;
		const loadAll = () => {
			fetchPi();
			fetchServer();
		};
		loadAll();
		interval = window.setInterval(loadAll, POLL_INTERVAL_MS);
		return () => interval && clearInterval(interval);
	});
</script>

{#if pi || server}
	<aside class="sys-status" role="status" aria-label="System status">
			{#if pi}
				<section class="host" style="--accent-hue: 210;">
					<span class="host__id">
						<img src="/svg/static/rpi.svg" height="21px" width="21px" alt="Raspberry Pi" />
						<span class="host__ip" title={pi.ipv4 ?? ''}>{pi.ipv4 ?? 'unknown'}</span>
					</span>

					<div class="metrics">
						{#if typeof pi.cpuTempC === 'number' || pi.load}
							{@const cpuC = typeof pi.cpuTempC === 'number' ? Math.round(pi.cpuTempC) : null}
							{@const cores = pi.cpuCount ?? null}
							{@const loadAvg = pi.load?.['1m'] ?? null}
							{@const loadPct = cores && cores > 0 && loadAvg ? Math.min(999, Math.round((loadAvg / cores) * 100)) : null}
							{@const cpuTone = cpuC ? toneForTemp(cpuC) : loadPct ? toneForPct(loadPct, { warn: 60, hot: 85 }) : 'info'}
							{@const cpuTitle = cpuC ? `CPU ${cpuC}°C` : ''}
							{@const loadTitle = loadPct !== null && loadAvg !== null ? `Load ${loadAvg.toFixed(2)} (${loadPct}% of ${cores}c)` : ''}
							{@const title = [cpuTitle, loadTitle].filter(Boolean).join(' · ')}
							<span class="metric metric--cpu" data-tone={cpuTone} title={title}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2" />
									<rect width="16" height="16" x="4" y="4" rx="2" />
									<rect width="8" height="8" x="8" y="8" rx="1" />
								</svg>
								{#if cpuC}<span class="v">{padNum(cpuC)}°C</span>{/if}
								{#if loadPct !== null}
									<span class="k">·</span>
									<span class="v">{padNum(loadPct)}%</span>
									{#if cores && loadAvg !== null}
										<span class="s">{loadAvg.toFixed(2)} · {cores}c</span>
									{/if}
								{/if}
							</span>
						{/if}

						{#if typeof pi.gpuTempC === 'number'}
							{@const gpuC = Math.round(pi.gpuTempC)}
							{@const gpuTone = toneForTemp(gpuC)}
							<span class="metric metric--gpu" data-tone={gpuTone} title={`GPU ${gpuC}°C`}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path d="M2 21V3m0 2h18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2.26M7 17v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3" />
									<circle cx="16" cy="11" r="2" />
									<circle cx="8" cy="11" r="2" />
								</svg>
								<span class="v">{padNum(gpuC)}°C</span>
							</span>
						{/if}

						{#if pi.mem}
							{@const pct = memPercent(pi.mem)}
							{@const memTone = pct !== null ? toneForPct(pct) : 'info'}
							<span
								class="metric metric--mem"
								data-tone={memTone}
								title={`Mem ${pct ?? '?'}% (${formatMem(pi.mem)})`}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path d="M12 12v-2m0 8v-2m4-4v-2m0 8v-2M2 11h1.5M20 18v-2m.5-5H22M4 18v-2m4-4v-2m0 8v-2" />
									<rect width="20" height="10" x="2" y="6" rx="2" />
								</svg>
								<span class="v">{pct !== null ? padNum(pct) : '?'}%</span>
								<span class="bar" style={pct !== null ? `--pct: ${clamp(0, pct, 100)}%;` : undefined}>
									<span class="bar__fill"></span>
								</span>
								<span class="s">{formatMem(pi.mem)}</span>
							</span>
						{/if}

						{#if typeof pi.uptimeSec === 'number'}
							{@const up = formatUptime(pi.uptimeSec)}
							<span class="metric metric--up" data-tone="info" title={`Uptime ${up}`}>
								<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 24 24">
									<path d="M12 5a.5.5 0 0 1 .5.5v6.376a.5.5 0 0 1-.248.432l-4.5 2.624a.5.5 0 1 1-.504-.864l4.252-2.479V5.5A.5.5 0 0 1 12 5m12 9.5a1.5 1.5 0 0 0-1.5-1.5H18a.5.5 0 0 0 0 1h4.275l-5.726 5.726a.955.955 0 0 1-1.347 0l-1.196-1.195a1.96 1.96 0 0 0-2.762 0l-4.606 4.606a.5.5 0 0 0 .708.707l4.606-4.606a.955.955 0 0 1 1.347 0l1.196 1.195a1.953 1.953 0 0 0 2.761 0L23 14.69v4.311a.5.5 0 0 0 1 0zM1 12C1 5.935 5.935 1 12 1c5.508 0 10.197 4.112 10.907 9.564a.505.505 0 0 0 .561.432.5.5 0 0 0 .432-.561C23.124 4.486 18.009 0 12 0 5.383 0 0 5.383 0 12c0 3.956 1.95 7.657 5.217 9.9a.497.497 0 0 0 .695-.129.5.5 0 0 0-.129-.695A11.01 11.01 0 0 1 1 12"/>
								</svg>
								<span class="k">up</span><span class="v">{up}</span>
							</span>
						{/if}
					</div>
				</section>
			{/if}
			{#if server}
				<section class="host" style="--accent-hue: 275;">
					<span class="host__id">
						<img src="/svg/static/server.svg" height="21px" width="21px" alt="Server" />
						<span class="host__ip" title={server.ipv4 ?? ''}>{server.ipv4 ?? 'unknown'}</span>
					</span>

					<div class="metrics">
						{#if typeof server.cpuTempC === 'number' || server.load}
							{@const cpuC = typeof server.cpuTempC === 'number' ? Math.round(server.cpuTempC) : null}
							{@const cores = server.cpuCount ?? null}
							{@const loadAvg = server.load?.['1m'] ?? null}
							{@const loadPct = cores && cores > 0 && loadAvg ? Math.min(999, Math.round((loadAvg / cores) * 100)) : null}
							{@const cpuTone = cpuC ? toneForTemp(cpuC) : loadPct ? toneForPct(loadPct, { warn: 60, hot: 85 }) : 'info'}
							{@const cpuTitle = cpuC ? `CPU ${cpuC}°C` : ''}
							{@const loadTitle = loadPct !== null && loadAvg !== null ? `Load ${loadAvg.toFixed(2)} (${loadPct}% of ${cores}c)` : ''}
							{@const title = [cpuTitle, loadTitle].filter(Boolean).join(' · ')}
							<span class="metric metric--cpu" data-tone={cpuTone} title={title}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2" />
									<rect width="16" height="16" x="4" y="4" rx="2" />
									<rect width="8" height="8" x="8" y="8" rx="1" />
								</svg>
								{#if cpuC}<span class="v">{padNum(cpuC)}°C</span>{/if}
								{#if loadPct !== null}
									<span class="k">·</span>
									<span class="v">{padNum(loadPct)}%</span>
									{#if cores && loadAvg !== null}
										<span class="s">{loadAvg.toFixed(2)} · {cores}c</span>
									{/if}
								{/if}
							</span>
						{/if}

						{#if typeof server.gpuTempC === 'number'}
							{@const gpuC = Math.round(server.gpuTempC)}
							{@const gpuTone = toneForTemp(gpuC)}
							<span class="metric metric--gpu" data-tone={gpuTone} title={`GPU ${gpuC}°C`}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path d="M2 21V3m0 2h18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2.26M7 17v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3" />
									<circle cx="16" cy="11" r="2" />
									<circle cx="8" cy="11" r="2" />
								</svg>
								<span class="v">{padNum(gpuC)}°C</span>
							</span>
						{/if}

						{#if server.mem}
							{@const pct = memPercent(server.mem)}
							{@const memTone = pct !== null ? toneForPct(pct) : 'info'}
							<span class="metric metric--mem" data-tone={memTone} title={`Mem ${pct ?? '?'}% (${formatMem(server.mem)})`}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path d="M12 12v-2m0 8v-2m4-4v-2m0 8v-2M2 11h1.5M20 18v-2m.5-5H22M4 18v-2m4-4v-2m0 8v-2" />
									<rect width="20" height="10" x="2" y="6" rx="2" />
								</svg>
								<span class="v">{pct !== null ? padNum(pct) : '?'}%</span>
								<span class="bar" style={pct !== null ? `--pct: ${clamp(0, pct, 100)}%;` : undefined}>
									<span class="bar__fill"></span>
								</span>
								<span class="s">{formatMem(server.mem)}</span>
							</span>
						{/if}

						{#if typeof server.uptimeSec === 'number'}
							{@const up = formatUptime(server.uptimeSec)}
							<span class="metric metric--up" data-tone="info" title={`Uptime ${up}`}>
								<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 24 24">
									<path d="M12 5a.5.5 0 0 1 .5.5v6.376a.5.5 0 0 1-.248.432l-4.5 2.624a.5.5 0 1 1-.504-.864l4.252-2.479V5.5A.5.5 0 0 1 12 5m12 9.5a1.5 1.5 0 0 0-1.5-1.5H18a.5.5 0 0 0 0 1h4.275l-5.726 5.726a.955.955 0 0 1-1.347 0l-1.196-1.195a1.96 1.96 0 0 0-2.762 0l-4.606 4.606a.5.5 0 0 0 .708.707l4.606-4.606a.955.955 0 0 1 1.347 0l1.196 1.195a1.953 1.953 0 0 0 2.761 0L23 14.69v4.311a.5.5 0 0 0 1 0zM1 12C1 5.935 5.935 1 12 1c5.508 0 10.197 4.112 10.907 9.564a.505.505 0 0 0 .561.432.5.5 0 0 0 .432-.561C23.124 4.486 18.009 0 12 0 5.383 0 0 5.383 0 12c0 3.956 1.95 7.657 5.217 9.9a.497.497 0 0 0 .695-.129.5.5 0 0 0-.129-.695A11.01 11.01 0 0 1 1 12"/>
								</svg>
								<span class="k">up</span><span class="v">{up}</span>
							</span>
						{/if}
					</div>
				</section>
			{/if}

	</aside>
{/if}

<style>
	.sys-status {
		--bar-h: 14px;
		--bar-w: 4cqi;
		--bg: oklch(0.17 0.01 254.17);
		--faint: color-mix(in oklab, oklch(1 0 231.14) 50%, transparent);
		--fs-k: 9.5px;
		--fs-s: 10.5px;
		--fs: 11.5px;
		--gap: 8px;
		--hot: oklch(0.73 0.16 25.78);
		--info: oklch(0.79 0.12 246.66);
		--muted: color-mix(in oklab, oklch(1 0 231.14) 65%, transparent);
		--ok: oklch(0.84 0.16 145.75);
		--r-chip: 999px;
		--r-pill: 999px;
		--shadow: 0 6px 20px color-mix(in oklab, oklch(0 0 0) 60%, transparent);
		--stroke-2: color-mix(in oklab, oklch(1 0 231.14) 9%, transparent);
		--stroke: color-mix(in oklab, oklch(1 0 231.14) 12%, transparent);
		--surface-2: color-mix(in oklab, oklch(1 0 231.14) 4.5%, transparent);
		--surface: color-mix(in oklab, oklch(1 0 231.14) 6%, transparent);
		--text: color-mix(in oklab, oklch(1 0 231.14) 95%, transparent);
		--tracking-k: 0.05em;
		--warn: oklch(0.86 0.13 89.95);
		--weight: 600;
		align-content: center;
		align-items: center;
		color: var(--text);
		container-type: inline-size;
		display: grid;
		font-size: var(--fs);
		font-variant-numeric: tabular-nums;
		gap: var(--gap);
		grid-area: sys;
		grid-template-columns: repeat(auto-fit, minmax(min(560px, 100%), 1fr));
		letter-spacing: 0.01em;
		line-height: 1;
		min-width: 0;
		padding: 0;

		& * {
			text-box: trim-both cap alphabetic;
			text-wrap: nowrap;
			white-space: nowrap;
		}

		/* .statusbar {
			align-items: center;
			container-type: inline-size;
			display: flex;
			flex-wrap: nowrap;
			font-size: var(--fs);
			font-variant-numeric: tabular-nums;
			gap: var(--gap);
			letter-spacing: 0.01em;
			line-height: 1;
			min-width: 0;
			overflow: hidden;
			white-space: nowrap;
			width: 100%;
		} */

		& .host {
			align-items: center;
			container-name: host;
			container-type: inline-size;
			display: flex;
			gap: 8px;
			justify-content: center;
			min-width: 0;
			padding: 3px 8px;
			transition: all 0.15s ease;
		}

		& .host__id {
			align-items: center;
			border-right: 1px solid color-mix(in oklab, oklch(1 0 231.14) 12%, transparent);
			display: inline-flex;
			flex: 0 1 auto;
			gap: 6px;
			min-width: 0;
			padding-right: 8px;
		}

		& .host__dot {
			background: var(--accent);
			border-radius: 2px;
			box-shadow:
				0 0 0 2px color-mix(in oklab, oklch(1 0 231.14) 8%, transparent),
				0 0 8px color-mix(in oklab, var(--accent) 40%, transparent);
			flex: 0 0 auto;
			height: 8px;
			width: 8px;
		}

		& .host__ip {
			direction: rtl;
			font-weight: var(--weight);
			min-inline-size: max-content;
			overflow: hidden;
			text-align: left;
			text-overflow: ellipsis;
		}

		& .metrics {
			align-items: stretch;
			display: flex;
			flex: 1 1 auto;
			gap: 5px;
			min-width: 0;
			overflow: hidden;
		}

		& .metric {
			align-items: center;
			background: var(--surface-2);
			border-radius: var(--r-chip);
			border: 1px solid var(--stroke-2);
			display: inline-flex;
			flex: 0 1 auto;
			gap: 5px;
			min-width: 0;
			padding: 2px 6px;
			transition: all 0.15s ease;
		}

		& .metric span {
			align-items: center;
			display: inline-flex;
		}

		& .metric svg {
			fill: var(--stroke);
			inline-size: 1.2rem;
			stroke: var(--text);
		}

		& .metric:hover {
			background: color-mix(in oklab, oklch(1 0 231.14) 6%, transparent);
			border-color: color-mix(in oklab, oklch(1 0 231.14) 12%, transparent);
		}

		& .metric .k {
			color: var(--muted);
			font-size: var(--fs-k);
			font-weight: 500;
			letter-spacing: var(--tracking-k);
			text-transform: uppercase;
		}

		& .metric .v {
			font-weight: var(--weight);
			white-space: wrap;
		}

		& .metric .s {
			color: var(--faint);
			font-size: var(--fs-s);
		}

		& .metric[data-tone='ok'] .v {
			color: var(--ok);
			text-shadow: 0 0 8px color-mix(in oklab, var(--ok) 30%, transparent);
		}

		& .metric[data-tone='warn'] .v {
			color: var(--warn);
			text-shadow: 0 0 8px color-mix(in oklab, var(--warn) 30%, transparent);
		}

		& .metric[data-tone='hot'] .v {
			color: var(--hot);
			text-shadow: 0 0 8px color-mix(in oklab, var(--hot) 30%, transparent);
		}

		& .metric[data-tone='info'] .v {
			color: var(--info);
		}

		& .metric--load .k {
			display: none;
		}

		& .metric--load .v {
			letter-spacing: 0.02em;
		}

		& .metric--mem {
			flex: 1 0 1.2rem;
			gap: 6px;
			min-width: max-content;
		}

		& .metric--mem .bar {
			--pct: 0%;
			background: color-mix(in oklab, oklch(1 0 231.14) 8%, transparent);
			border-radius: var(--r-pill);
			border: 1px solid color-mix(in oklab, oklch(1 0 231.14) 12%, transparent);
			box-shadow: 0 1px 3px color-mix(in oklab, oklch(0 0 0) 20%, transparent) inset;
			display: flex;
			flex: 1 1 7rem;
			height: var(--bar-h);
			inline-size: auto;
			max-inline-size: 11rem;
			min-inline-size: 1.75rem;
			overflow: hidden;
			position: relative;
		}

		& .metric--mem .bar__fill {
			background: linear-gradient(
				90deg,
				var(--accent),
				color-mix(in oklab, var(--accent) 70%, transparent)
			);
			border-radius: var(--r-pill);
			box-shadow:
				0 0 8px color-mix(in oklab, var(--accent) 50%, transparent),
				0 1px 0 color-mix(in oklab, oklch(1 0 231.14) 20%, transparent) inset;
			height: 100%;
			position: relative;
			transition: width 0.3s ease;
			width: var(--pct);
		}

		& .metric--mem .bar__fill::after {
			background: linear-gradient(
				180deg,
				color-mix(in oklab, oklch(1 0 231.14) 25%, transparent),
				transparent
			);
			border-radius: var(--r-pill);
			content: '';
			height: 50%;
			left: 0;
			position: absolute;
			right: 0;
			top: 0;
		}

		& .metric--mem .s {
			min-inline-size: max-content;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		& .metric--up .k {
			display: none;
		}

		/* 1) Start stacking the "s" strings (load + mem details) */
		@container host (max-width: 640px) {
			/* & .metric--cpu,
			& .metric--mem {
				flex-wrap: wrap;
				row-gap: 2px;
			}

			& .metric--cpu .s,
			& .metric--mem .s {
				flex: 1 0 100%;
				min-width: 0;
				text-align: right;
				text-wrap: wrap;
				white-space: normal;
			} */

			/* optional: hides the dot "·" so it doesn't end up dangling */
			& .metric--cpu .k {
				/* display: none; */
			}
		}

		/* 2) If it gets tighter, drop those strings entirely */
		@container host (max-width: 560px) {
			& .metric--cpu .s {
				display: none;
			}

			& .metric--mem .s {
				display: none;
			}
		}

		/* 3) If still tighter, drop the bar */
		@container host (max-width: 500px) {
			& .metric--mem .bar {
				display: none;
			}
		}

		/* 4) Your existing "mem metric disappears" threshold (kept) */
		@container host (max-width: 489.9px) {
			& .metric--mem {
				display: none;
			}
		}
	}
</style>
