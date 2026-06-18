import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

type AdminAuthResult = { ok: true } | { ok: false; response: Response };

const ADMIN_TOKEN_HEADER = 'x-admin-token';
const JSON_HEADERS = {
	'cache-control': 'no-store',
	'content-type': 'application/json; charset=utf-8'
} as const;

const toDigest = (value: string): Buffer => createHash('sha256').update(value).digest();

const constantTimeEquals = (left: string, right: string): boolean =>
	timingSafeEqual(toDigest(left), toDigest(right));

const authError = (error: string, status: number): AdminAuthResult => ({
	ok: false,
	response: new Response(JSON.stringify({ error }), {
		status,
		headers: JSON_HEADERS
	})
});

export const requireAdmin = (request: Request): AdminAuthResult => {
	const expectedToken = env.COUNTDOWN_ADMIN_TOKEN?.trim();
	if (!expectedToken) {
		return authError('Countdown admin token is not configured', 503);
	}

	const suppliedToken = request.headers.get(ADMIN_TOKEN_HEADER) ?? '';
	if (!constantTimeEquals(suppliedToken, expectedToken)) {
		return authError('Unauthorized', 401);
	}

	return { ok: true };
};
