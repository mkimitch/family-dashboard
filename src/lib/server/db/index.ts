import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

const DEFAULT_COUNTDOWN_DB_URL = 'file:./data/family-dashboard.db';

const getCountdownDbUrl = (): string => env.COUNTDOWN_DB_URL?.trim() || DEFAULT_COUNTDOWN_DB_URL;

const getFilePathFromUrl = (url: string): string | null => {
	if (!url.startsWith('file:')) return null;

	const filePath = url.slice('file:'.length).replace(/^\/\//, '');
	if (!filePath || filePath === ':memory:') return null;
	return filePath.startsWith('/') ? filePath : resolve(process.cwd(), filePath);
};

const ensureFileDbDirectory = (url: string) => {
	const filePath = getFilePathFromUrl(url);
	if (!filePath) return;

	const dir = dirname(filePath);
	if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
};

export const countdownDbUrl = getCountdownDbUrl();
ensureFileDbDirectory(countdownDbUrl);

export const countdownDbClient = createClient({ url: countdownDbUrl });
export const db = drizzle(countdownDbClient, { schema });

export type CountdownDatabase = LibSQLDatabase<typeof schema>;
