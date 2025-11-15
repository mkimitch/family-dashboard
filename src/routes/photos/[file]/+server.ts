import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

export const GET: RequestHandler = async ({ params }) => {
  try {
    const base = env.PHOTO_DIR
      ? path.resolve(env.PHOTO_DIR)
      : path.resolve(process.cwd(), 'static', 'photos');

    const raw = params.file ?? '';
    // basic traversal protection
    if (!raw || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
      return new Response('Bad Request', { status: 400 });
    }

    const abs = path.resolve(base, raw);
    if (!abs.startsWith(base)) return new Response('Forbidden', { status: 403 });

    const stat = await fs.stat(abs).catch(() => null);
    if (!stat || !stat.isFile()) return new Response('Not Found', { status: 404 });

    const data = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    return new Response(data, {
      status: 200,
      headers: {
        'content-type': type,
        // keep fresh so changes show up immediately
        'cache-control': 'no-store'
      }
    });
  } catch (err) {
    return new Response('Internal Server Error', { status: 500 });
  }
};
