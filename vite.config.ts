import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true,
		allowedHosts: ['vaio.home.arpa', '.home.arpa'],
		fs: {
			// Allow Yarn PnP virtual directories so SvelteKit runtime files can be served in dev
			allow: ['..', '.yarn', '.yarn/__virtual__']
		}
	},
	preview: {
		host: true,
		allowedHosts: ['vaio.home.arpa', '.home.arpa']
	}
});
