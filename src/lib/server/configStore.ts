import type {
    CalendarConfig,
    CalendarOverlayEvent,
    CountdownConfig,
    HeroMessageConfig
} from '$lib/config/types';
import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');

async function ensureDir() {
	await fs.mkdir(STORAGE_DIR, { recursive: true });
}

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
	try {
		const full = path.join(STORAGE_DIR, fileName);
		const buf = await fs.readFile(full, 'utf8');
		const parsed = JSON.parse(buf);
		return parsed as T;
	} catch {
		return fallback;
	}
}

async function writeJsonFile<T>(fileName: string, value: T): Promise<void> {
	await ensureDir();
	const full = path.join(STORAGE_DIR, fileName);
	const json = JSON.stringify(value, null, 2) + '\n';
	await fs.writeFile(full, json, 'utf8');
}

export async function readHeroMessages(): Promise<HeroMessageConfig[]> {
	return readJsonFile<HeroMessageConfig[]>('hero-messages.json', []);
}

export async function writeHeroMessages(list: HeroMessageConfig[]): Promise<void> {
	await writeJsonFile('hero-messages.json', list);
}

export async function readCountdowns(): Promise<CountdownConfig[]> {
	return readJsonFile<CountdownConfig[]>('countdowns.json', []);
}

export async function writeCountdowns(list: CountdownConfig[]): Promise<void> {
	await writeJsonFile('countdowns.json', list);
}

export async function readCalendarConfigs(): Promise<CalendarConfig[]> {
	return readJsonFile<CalendarConfig[]>('calendar-config.json', []);
}

export async function writeCalendarConfigs(list: CalendarConfig[]): Promise<void> {
	await writeJsonFile('calendar-config.json', list);
}

export async function readCalendarOverlays(): Promise<CalendarOverlayEvent[]> {
	return readJsonFile<CalendarOverlayEvent[]>('calendar-overlays.json', []);
}

export async function writeCalendarOverlays(list: CalendarOverlayEvent[]): Promise<void> {
	await writeJsonFile('calendar-overlays.json', list);
}
