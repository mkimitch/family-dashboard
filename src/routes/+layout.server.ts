import { resolveRequestDateTimeDisplaySettings } from '$lib/server/dateTime';
import { readInstallationSettings } from '$lib/server/daymarkSettings';
import type { LayoutServerLoad } from './$types';

export type SchoolMenuItem = {
	name: string;
	station: string;
	confidence: string;
	ingredients?: string;
	image_url?: string | null;
};

export type SchoolMenu = {
	date: string;
	generated_at: string;
	vegetarian: SchoolMenuItem[];
	ambiguous: SchoolMenuItem[];
	unknown?: SchoolMenuItem[];
	source?: {
		host: string;
		school: string;
		menu_type: string;
		week_start: string;
		url: string;
	};
} | null;

export const load: LayoutServerLoad = async (event: Parameters<LayoutServerLoad>[0]) => {
	const { fetch } = event;
	const dateTimeDisplay = resolveRequestDateTimeDisplaySettings();
	if (event.route.id === '/dev/weather-conditions') {
		return {
			installationSettings: await readInstallationSettings(),
			dateTimeDisplay,
			weather: null,
			photos: [],
			schoolMenu: null
		};
	}
	const [weatherRes, photosRes, schoolMenuRes, installationSettings] = await Promise.all([
		fetch('/api/weather', { cache: 'no-store' }),
		fetch('/api/photos', { cache: 'no-store' }),
		fetch('/api/school-menu', { cache: 'no-store' }),
		readInstallationSettings()
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

	let schoolMenu: SchoolMenu = null;
	if (schoolMenuRes.ok) {
		try {
			schoolMenu = (await schoolMenuRes.json()) as SchoolMenu;
		} catch {
			schoolMenu = null;
		}
	}

	return {
		installationSettings,
		dateTimeDisplay,
		weather,
		photos,
		schoolMenu
	};
};
