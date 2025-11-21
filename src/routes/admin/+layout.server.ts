import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const isLogin = url.pathname === '/admin/login' || url.pathname.endsWith('/admin/login');
	const isAdmin = cookies.get('admin') === '1';
	if (!isAdmin && !isLogin) {
		throw redirect(302, '/admin/login');
	}
	return {};
};
