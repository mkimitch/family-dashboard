import type { RequestHandler } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import os from 'node:os';

const CPU_TEMP_PATHS = [
	'/sys/class/thermal/thermal_zone0/temp',
	'/sys/devices/virtual/thermal/thermal_zone0/temp'
];

async function readCpuTempC(): Promise<number | null> {
	for (const path of CPU_TEMP_PATHS) {
		try {
			const raw = await fs.readFile(path, 'utf8');
			const milli = Number.parseInt(raw.trim(), 10);
			if (Number.isFinite(milli)) return milli / 1000;
		} catch {
			// ignore and try next
		}
	}
	return null;
}

async function readGpuTempC(): Promise<number | null> {
	const file = process.env.GPU_TEMP_FILE;
	if (!file) return null;
	try {
		const raw = await fs.readFile(file, 'utf8');
		const val = Number.parseFloat(raw.trim());
		if (Number.isFinite(val)) return val;
	} catch {
		// ignore
	}
	return null;
}

export const GET: RequestHandler = async () => {
	const [load1, load5, load15] = os.loadavg();
	const uptimeSec = os.uptime();
	const totalMem = os.totalmem();
	const freeMem = os.freemem();
	const usedMem = totalMem - freeMem;
	const cpuCount = os.cpus()?.length ?? null;
	const [cpuTempC, gpuTempC] = await Promise.all([readCpuTempC(), readGpuTempC()]);

	const toMB = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

	const payload = {
		cpuCount,
		cpuTempC,
		gpuTempC,
		load: {
			'1m': load1,
			'5m': load5,
			'15m': load15
		},
		uptimeSec,
		mem: {
			totalMB: toMB(totalMem),
			usedMB: toMB(usedMem),
			freeMB: toMB(freeMem)
		}
	};

	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
};
