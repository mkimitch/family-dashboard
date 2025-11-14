<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Wallpaper from '$lib/components/Wallpaper.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<meta name="color-scheme" content="light dark" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-root">
	<Wallpaper />
	<div class="app-content">{@render children()}</div>
</div>
