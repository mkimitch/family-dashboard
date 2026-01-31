import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const IMAGES_RX = /\.(jpe?g|png|webp|gif)$/i;

export const GET: RequestHandler = async () => {
	try {
		const dir = env.PHOTO_DIR
			? path.resolve(env.PHOTO_DIR)
			: path.resolve(process.cwd(), 'static', 'photos');

		let entries = await fs.readdir(path.join(dir, 'kiosk'), { withFileTypes: true }).catch(() => null);
		let urlPrefix = '/photos/kiosk';

		if (!entries || !entries.some((d) => d.isFile() && IMAGES_RX.test(d.name))) {
			entries = await fs.readdir(dir, { withFileTypes: true });
			urlPrefix = '/photos';
		}

		const files = entries
			.filter((d) => d.isFile() && IMAGES_RX.test(d.name))
			.map((d) => `${urlPrefix}/${d.name}`);
		return new Response(JSON.stringify({ files }), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
		});
	} catch {
		return new Response(JSON.stringify({ files: [] }), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
		});
	}
};
