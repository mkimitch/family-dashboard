import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	if (cookies.get('admin') === '1') {
		throw redirect(302, '/admin');
	}
	const tokenConfigured = Boolean(env.ADMIN_TOKEN);
	return { tokenConfigured };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = String(data.get('password') ?? '');
		const expected = env.ADMIN_TOKEN;
		if (expected && password !== expected) {
			return fail(400, { error: 'Invalid password', tokenConfigured: true });
		}
		cookies.set('admin', '1', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			maxAge: 60 * 60 * 24 * 30
		});
		throw redirect(303, '/admin');
	}
};
