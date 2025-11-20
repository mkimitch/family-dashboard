<script lang="ts">
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';

	type Load = { '1m': number; '5m': number; '15m': number };
	type Mem = { totalMB: number; usedMB: number; freeMB: number };
	type SysInfo = {
		cpuTempC?: number | null;
		gpuTempC?: number | null;
		cpuCount?: number | null;
		load?: Load | null;
		uptimeSec?: number | null;
		mem?: Mem | null;
	};

	// Provide deterministic display metrics while developing without the Raspberry Pi endpoint.
	const MOCK_PI: SysInfo = {
		cpuTempC: 52.3,
		gpuTempC: 49.1,
		cpuCount: 4,
		load: { '1m': 0.42, '5m': 0.35, '15m': 0.3 },
		uptimeSec: 3 * 3600,
		mem: { totalMB: 1024, usedMB: 512, freeMB: 512 }
	};

	const ICONS = {
		display: '/svg/static/rpi.svg',
		server: '/svg/static/server.svg',
		cpu: '/svg/static/cpu-outline.svg',
		gpu: '/svg/static/gpu-color.svg',
		uptime: '/svg/static/uptime-outline-thin.svg'
	} as const;

	// Refresh both endpoints every 15s to keep the dashboard metrics current without overloading the Pi.
	const POLL_INTERVAL_MS = 15000;

	let pi: SysInfo | null = null;
	let server: SysInfo | null = null;
	let interval: number | undefined;

	function formatUptime(sec: number | null | undefined): string {
		if (!sec || !Number.isFinite(sec)) return '';
		const s = Math.floor(sec);
		const days = Math.floor(s / 86400);
		const hours = Math.floor((s % 86400) / 3600);
		const minutes = Math.floor((s % 3600) / 60);
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function formatLoad(load: Load | null | undefined, cpuCount?: number | null): string {
		if (!load) return '';
		const raw = load['1m'];
		if (cpuCount && cpuCount > 0) {
			const pct = Math.min(999, Math.round((raw / cpuCount) * 100));
			return `${raw.toFixed(2)} (${pct}% of ${cpuCount}c)`;
		}
		return raw.toFixed(2);
	}

	function formatMem(mem: Mem | null | undefined): string {
		if (!mem) return '';
		const used =
			mem.usedMB >= 1024 ? `${(mem.usedMB / 1024).toFixed(1)} GB` : `${Math.round(mem.usedMB)} MB`;
		const total =
			mem.totalMB >= 1024
				? `${(mem.totalMB / 1024).toFixed(1)} GB`
				: `${Math.round(mem.totalMB)} MB`;
		return `${used}/${total}`;
	}

	function memPercent(mem: Mem | null | undefined): number | null {
		if (!mem) return null;
		return Math.max(0, Math.min(100, Math.round((mem.usedMB / mem.totalMB) * 100)));
	}

	async function fetchPi() {
		try {
			const r = await fetch('http://127.0.0.1:9000/sysinfo', { cache: 'no-store' });
			if (!r.ok) {
				if (dev) pi = MOCK_PI;
				return;
			}
			const data = (await r.json()) as SysInfo;
			const hasData =
				!!data &&
				(data.cpuTempC != null ||
					data.gpuTempC != null ||
					data.load != null ||
					data.mem != null ||
					data.uptimeSec != null);
			pi = hasData ? data : dev ? MOCK_PI : null;
		} catch {
			pi = dev ? MOCK_PI : null;
		}
	}

	async function fetchServer() {
		try {
			const r = await fetch('/api/server-sysinfo', { cache: 'no-store' });
			if (!r.ok) return;
			server = (await r.json()) as SysInfo;
		} catch {
			server = null;
		}
	}

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
			<div class="chip" aria-label="Display metrics">
				<img src={ICONS.display} alt="Display" class="endpoint-icon" width="20" height="20" />
				<span class="metrics">
					{#if typeof pi.cpuTempC === 'number'}
						<span class="metric">
							cpu {pi.cpuTempC.toFixed(0)}°C
						</span>
					{/if}
					{#if typeof pi.gpuTempC === 'number'}
						<span class="metric">
							gpu {pi.gpuTempC.toFixed(0)}°C
						</span>
					{/if}
					{#if pi.load}
						<span class="metric">
							load {formatLoad(pi.load, pi?.cpuCount)}
						</span>
					{/if}
					{#if pi.mem}
						{@const pct = memPercent(pi.mem)}
						<span class="metric mem" style={pct !== null ? `--mem-pct:${pct}%` : undefined}>
							mem {pct ?? '?'}%
							<span class="mem-bar" aria-hidden="true">
								<span style={pct !== null ? `width:${pct}%` : undefined}></span>
							</span>
							<span class="mem-detail">{formatMem(pi.mem)}</span>
						</span>
					{/if}
					{#if typeof pi.uptimeSec === 'number'}
						<span class="metric">
							up {formatUptime(pi.uptimeSec)}
						</span>
					{/if}
				</span>
			</div>
		{/if}
		{#if server}
			<div class="chip" aria-label="Server metrics">
				<img src={ICONS.server} alt="Server" class="endpoint-icon" width="20" height="20" />
				<span class="metrics">
					{#if typeof server.cpuTempC === 'number'}
						<span class="metric">
							cpu {server.cpuTempC.toFixed(0)}°C
						</span>
					{/if}
					{#if typeof server.gpuTempC === 'number'}
						<span class="metric">
							gpu {server.gpuTempC.toFixed(0)}°C
						</span>
					{/if}
					{#if server.load}
						<span class="metric">
							load {formatLoad(server.load, server?.cpuCount)}
						</span>
					{/if}
					{#if server.mem}
						{@const pct = memPercent(server.mem)}
						<span class="metric mem" style={pct !== null ? `--mem-pct:${pct}%` : undefined}>
							mem {pct ?? '?'}%
							<span class="mem-bar" aria-hidden="true">
								<span style={pct !== null ? `width:${pct}%` : undefined}></span>
							</span>
							<span class="mem-detail">{formatMem(server.mem)}</span>
						</span>
					{/if}
					{#if typeof server.uptimeSec === 'number'}
						<span class="metric">
							up {formatUptime(server.uptimeSec)}
						</span>
					{/if}
				</span>
			</div>
		{/if}
	</aside>
{/if}
