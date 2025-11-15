<script lang="ts">
	import { onMount } from 'svelte';

	type PhotoList = { files: string[] };
	let files: string[] = [];
	let aSrc = '';
	let bSrc = '';
	let showA = true;
	let index = 0;
	let timer: number | undefined;
	let refreshTimer: number | undefined;
	const INTERVAL_MS = 15000;
	const FADE_MS = 1200;
	let reduceMotion = false;

	async function loadPhotos() {
		try {
			const r = await fetch('/api/photos', { cache: 'no-store' });
			if (!r.ok) return;
			const data = (await r.json()) as PhotoList;
			files = Array.isArray(data?.files) ? data.files.slice() : [];
			if (!files.length) return;
			index = 0;
			aSrc = files[index % files.length];
			prefetch(files[(index + 1) % files.length]);
		} catch {}
	}

	function prefetch(src: string) {
		const img = new Image();
		img.src = src;
	}

	function next() {
		if (!files.length) return;
		index = (index + 1) % files.length;
		const nextSrc = files[index];
		if (showA) {
			bSrc = nextSrc;
			showA = false;
		} else {
			aSrc = nextSrc;
			showA = true;
		}
		prefetch(files[(index + 1) % files.length]);
	}

	function handleError() {
		loadPhotos();
		next();
	}

	onMount(() => {
		reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		loadPhotos();
		if (!reduceMotion) {
			timer = window.setInterval(next, INTERVAL_MS);
		}
		refreshTimer = window.setInterval(loadPhotos, 5 * 60 * 1000);
		return () => {
			timer && clearInterval(timer);
			refreshTimer && clearInterval(refreshTimer);
		};
	});
</script>

<div class="wallpaper" aria-hidden="true">
	<img
		class="wp wp-a"
		src={aSrc}
		alt=""
		loading="eager"
		aria-hidden="true"
		style:opacity={showA ? 1 : 0}
	/>
	<img
		class="wp wp-b"
		src={bSrc}
		alt=""
		loading="lazy"
		aria-hidden="true"
		style:opacity={showA ? 0 : 1}
	/>
</div>
