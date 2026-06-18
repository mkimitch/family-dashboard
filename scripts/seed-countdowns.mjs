import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient } from '@libsql/client';
import ts from 'typescript';

try {
	process.loadEnvFile?.('.env');
} catch {
	// Local env files are optional for seed runs.
}

const DEFAULT_COUNTDOWN_DB_URL = 'file:./data/family-dashboard.db';
const dbUrl = process.env.COUNTDOWN_DB_URL?.trim() || DEFAULT_COUNTDOWN_DB_URL;

const getFilePathFromUrl = (url) => {
	if (!url.startsWith('file:')) return null;
	const filePath = url.slice('file:'.length).replace(/^\/\//, '');
	if (!filePath || filePath === ':memory:') return null;
	return filePath.startsWith('/') ? filePath : resolve(process.cwd(), filePath);
};

const filePath = getFilePathFromUrl(dbUrl);
if (filePath) mkdirSync(dirname(filePath), { recursive: true });

const loadSeedCountdowns = async () => {
	const source = readFileSync(resolve('src/lib/config/countdowns.ts'), 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ES2022,
			target: ts.ScriptTarget.ES2022
		}
	});
	const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
	const module = await import(moduleUrl);

	if (!Array.isArray(module.default)) {
		throw new Error('src/lib/config/countdowns.ts did not export a countdown array');
	}

	return module.default;
};

const client = createClient({ url: dbUrl });
const now = Date.now();
let inserted = 0;

for (const item of await loadSeedCountdowns()) {
	const result = await client.execute({
		sql: `
			insert into countdowns (
				id,
				label,
				description,
				target_date,
				target_time,
				time_zone,
				is_all_day,
				is_enabled,
				show_when_expired,
				starts_at,
				ends_at,
				sort_order,
				priority,
				variant,
				created_at,
				updated_at,
				deleted_at
			)
			values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			on conflict(id) do nothing
		`,
		args: [
			item.id,
			item.label,
			null,
			item.targetDate,
			null,
			null,
			1,
			item.enabled === false ? 0 : 1,
			item.showWhenExpired ? 1 : 0,
			item.startsAt ?? null,
			item.endsAt ?? null,
			item.sortOrder ?? null,
			0,
			item.variant ?? 'default',
			now,
			now,
			null
		]
	});

	inserted += Number(result.rowsAffected ?? 0);
}

client.close();
console.log(`Seeded ${inserted} countdown${inserted === 1 ? '' : 's'}.`);
