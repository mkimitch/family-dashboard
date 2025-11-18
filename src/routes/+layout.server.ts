import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
	const [weatherRes, photosRes] = await Promise.all([
		fetch('/api/weather', { cache: 'no-store' }),
		fetch('/api/photos', { cache: 'no-store' })
	]);

	let weather: unknown = null;
	if (weatherRes.ok && weatherRes.status !== 204) {
		try {
			const raw = await weatherRes.json();
			// API returns either { data: ... } or the root object directly
			weather = (raw as any)?.data ?? raw;
		} catch {
			weather = null;
		}
	}

	let photos: string[] = [];
	if (photosRes.ok) {
		try {
			const data = (await photosRes.json()) as { files?: string[] } | null;
			if (data && Array.isArray(data.files)) photos = data.files;
		} catch {
			photos = [];
		}
	}

	return {
		weather,
		photos
	};
};
