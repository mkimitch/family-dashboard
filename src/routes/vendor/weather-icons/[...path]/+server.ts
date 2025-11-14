import { createRequire } from 'node:module';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { RequestHandler } from '@sveltejs/kit';

const require = createRequire(import.meta.url);

const resolveIconsRoot = (): string | null => {
	const candidates = ['@lxg/weather-icons', '@bybas/weather-icons'];
	for (const pkg of candidates) {
		try {
			const pkgPath = require.resolve(`${pkg}/package.json`);
			return path.dirname(pkgPath);
		} catch {}
	}
	return null;
};

const ICONS_ROOT = resolveIconsRoot();

export const GET: RequestHandler = async (event) => {
	if (!ICONS_ROOT) return new Response('Not configured', { status: 404 });
	const rel = event.params.path || '';
	const base = path.join(ICONS_ROOT, 'production');
	const target = path.join(base, rel);
	const normBase = path.resolve(base);
	const normTarget = path.resolve(target);
	if (!normTarget.startsWith(normBase)) return new Response('Forbidden', { status: 403 });
	try {
		const buf = await fs.readFile(normTarget);
		const ext = path.extname(normTarget).toLowerCase();
		const type = ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
		return new Response(buf, {
			status: 200,
			headers: { 'content-type': type, 'cache-control': 'public, max-age=2592000' }
		});
	} catch {
		return new Response('Not found', { status: 404 });
	}
};
