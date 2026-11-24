// Runs only in the disposable workspace created by capture.mjs. No production
// server loader, API route, environment file, or data directory is copied there.
import { build, createServer, preview } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { root } from './common.mjs';

const config = {
	configFile: false,
	envDir: process.cwd(),
	plugins: [sveltekit()],
	server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } }
};
const production = process.argv.includes('--production');
if (production) await build();
const server = production
	? await preview({ preview: { host: '127.0.0.1', port: 0 } })
	: await createServer(config);
if (!production) await server.listen();
process.send({ origin: server.resolvedUrls.local[0].replace(/\/$/, '') });
const close = async () => {
	await server.close();
	process.exit(0);
};
process.on('SIGTERM', close);
process.on('SIGINT', close);
process.on('disconnect', close);
