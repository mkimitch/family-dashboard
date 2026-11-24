import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
	parseInstallationSettings,
	resolveSettings,
	simplifiedDecoration
} from './config/daymarkSettings';
import { readInstallationSettings } from './server/daymarkSettings';

const params = new URLSearchParams();
describe('Daymark settings', () => {
	it('inherits by field and isolates the decoration and preview layers', () => {
		const source = parseInstallationSettings({
			version: 1,
			global: { density: 'full', motions: { head: { enabled: false, durationMs: 1400 } } },
			decorations: {
				thanksgiving: { motions: { head: { durationMs: 600, intervalMs: [9000, 1000] } } },
				diwali: { density: 'adaptive', motions: { head: { enabled: true } } }
			}
		});
		expect(resolveSettings(undefined, null, params).density).toBe('adaptive');
		expect(resolveSettings(source, 'thanksgiving', params)).toMatchObject({
			density: 'full',
			turkey: { head: { enabled: false, durationMs: 600, intervalMs: [25000, 45000] } }
		});
		expect(resolveSettings(source, 'diwali', params)).toMatchObject({
			density: 'adaptive',
			turkey: { head: { enabled: false, durationMs: 1400 } }
		});
		expect(
			resolveSettings(source, 'diwali', new URLSearchParams('decorationDensity=reduced')).density
		).toBe('reduced');
		expect(
			resolveSettings(source, 'diwali', new URLSearchParams('decorationDensity=bad')).density
		).toBe('adaptive');
		expect(resolveSettings(source, 'diwali', params).density).toBe('adaptive');
	});
	it('inherits the peck style and validates scoped and temporary overrides', () => {
		const style = (doc: unknown, query = '') =>
			resolveSettings(parseInstallationSettings(doc), 'thanksgiving', new URLSearchParams(query))
				.groundPeckStyle;
		expect(style({ version: 1 })).toBe('random');
		const global = { version: 1, global: { groundPeckStyle: 'single' } };
		expect(style(global)).toBe('single');
		const local = {
			...global,
			decorations: {
				thanksgiving: { groundPeckStyle: 'double' },
				diwali: { groundPeckStyle: 'double' }
			}
		};
		expect(style(local)).toBe('double');
		expect(parseInstallationSettings(local).decorations?.diwali).not.toHaveProperty(
			'groundPeckStyle'
		);
		expect(style(local, 'groundPeckStyle=random')).toBe('random');
		expect(style(local, 'groundPeckStyle=typo')).toBe('double');
		expect(style({ ...global, decorations: { thanksgiving: { groundPeckStyle: false } } })).toBe(
			'single'
		);
		expect(style({ version: 1, global: { groundPeckStyle: 123 } })).toBe('random');
	});
	it.each([false, true])('density policy preserves the raw crowded value %s', (crowded) => {
		expect(simplifiedDecoration('adaptive', crowded, 'diwali')).toBe(crowded);
		expect(simplifiedDecoration('adaptive', crowded, 'thanksgiving')).toBe(crowded);
		expect(simplifiedDecoration('adaptive', crowded, 'halloween')).toBe(false);
		expect(simplifiedDecoration('full', crowded, 'thanksgiving')).toBe(false);
		expect(simplifiedDecoration('reduced', crowded, 'halloween')).toBe(true);
	});
	it('reads on reload, validates versions and never writes preview values', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'daymark-settings-'));
		const path = join(dir, 'settings.json');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			expect(await readInstallationSettings(path)).toEqual({ version: 1 });
			expect(warn).not.toHaveBeenCalled();
			for (const input of ['{', '{"version":2}']) {
				await writeFile(path, input);
				expect(await readInstallationSettings(path)).toEqual({ version: 1 });
			}
			expect(warn).toHaveBeenCalledTimes(2);
			const json = '{"version":1,"global":{"density":"full"}}';
			await writeFile(path, json);
			const installation = await readInstallationSettings(path);
			expect(
				resolveSettings(installation, 'diwali', new URLSearchParams('decorationDensity=reduced'))
					.density
			).toBe('reduced');
			expect(await readFile(path, 'utf8')).toBe(json);
			expect(resolveSettings(await readInstallationSettings(path), 'diwali', params).density).toBe(
				'full'
			);
		} finally {
			warn.mockRestore();
			await rm(dir, { recursive: true });
		}
	});
});
