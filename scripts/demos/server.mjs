// Runs only in the disposable workspace created by capture.mjs. No production
// server loader, API route, environment file, or data directory is copied there.
import { createServer } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { root } from './common.mjs';

const server = await createServer({
	configFile: false,
	envDir: process.cwd(),
	plugins: [sveltekit()],
	server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } }
});
await server.listen();
process.send({ origin: server.resolvedUrls.local[0].replace(/\/$/, '') });
const close = async () => {
	await server.close();
	process.exit(0);
};
process.on('SIGTERM', close);
process.on('SIGINT', close);
process.on('disconnect', close);
