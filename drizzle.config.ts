import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside SvelteKit, so it cannot use `$env`. Load `.env` (if
// present) and read `process.env` directly. The default path matches the app's
// runtime default so `yarn db:migrate` and the server target the same file.
try {
	process.loadEnvFile('.env');
} catch {
	// .env is optional during CI / fresh checkouts; ignore when missing.
}

const url = process.env.COUNTDOWN_DB_URL ?? 'file:./data/family-dashboard.db';

// Ensure the local data directory exists for file-based libsql URLs.
const filePath = url.startsWith('file:') ? url.slice('file:'.length).replace(/^\/\//, '') : null;
if (filePath) {
	const dir = dirname(filePath);
	if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
}

export default defineConfig({
	dialect: 'turso',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dbCredentials: { url }
});
