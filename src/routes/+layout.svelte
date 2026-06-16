<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import SnowOverlay from '$lib/components/SnowOverlay.svelte';
	import Wallpaper from '$lib/components/Wallpaper.svelte';
	import { onMount } from 'svelte';
	import { updated } from '$app/stores';

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.has('kiosk')) {
			document.documentElement.dataset.kiosk = 'true';
		}

		// Check for updates every minute and reload if a new version is found
		const interval = setInterval(async () => {
			if (await updated.check()) {
				window.location.reload();
			}
		}, 60000);

		return () => clearInterval(interval);
	});

	let { children, data } = $props();
</script>

<svelte:head>
	<meta name="color-scheme" content="light dark" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-root">
	<Wallpaper initialPhotos={data.photos} />
	<!-- <SnowOverlay /> -->
	<div class="app-content">{@render children()}</div>
</div>
