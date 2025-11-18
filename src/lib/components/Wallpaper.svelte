<script lang="ts">
	import { onMount } from 'svelte';

	type PhotoList = { files: string[] };
	let { initialPhotos = [] } = $props();
	let files = $state<string[]>([]);
	let aSrc = $state('');
	let bSrc = $state('');
	let showA = $state(true);
	let index = $state(0);
	let timer: number | undefined;
	let refreshTimer: number | undefined;
	const MIN_INTERVAL_MS = 5 * 60 * 1000;
	const MAX_INTERVAL_MS = 10 * 60 * 1000;
	const FADE_MS = 1200;
	let reduceMotion = $state(false);

	async function loadPhotos() {
		try {
			const r = await fetch('/api/photos', { cache: 'no-store' });
			if (!r.ok) return;
			const data = (await r.json()) as PhotoList;
			const list = Array.isArray(data?.files) ? data.files.slice() : [];
			if (!list.length) return;
			files = shuffle(list);
			index = 0;
			aSrc = files[index % files.length];
			const nextPrefetch = files[(index + 1) % files.length];
			if (nextPrefetch) prefetch(nextPrefetch);
		} catch {}
	}

	function prefetch(src: string) {
		const img = new Image();
		img.src = src;
	}

	function shuffle<T>(arr: T[]): T[] {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
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
		const nextPrefetch = files[(index + 1) % files.length];
		if (nextPrefetch) prefetch(nextPrefetch);
	}

	function scheduleNext() {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
		if (reduceMotion) return;
		const span = MAX_INTERVAL_MS - MIN_INTERVAL_MS;
		const delay = MIN_INTERVAL_MS + (span > 0 ? Math.floor(Math.random() * span) : 0);
		timer = window.setTimeout(() => {
			next();
			scheduleNext();
		}, delay);
	}

	function handleError() {
		loadPhotos();
		next();
	}

	onMount(() => {
		reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		if (Array.isArray(initialPhotos) && initialPhotos.length) {
			files = shuffle(initialPhotos.slice());
			index = 0;
			aSrc = files[index % files.length];
			const nextPrefetch = files[(index + 1) % files.length];
			if (nextPrefetch) prefetch(nextPrefetch);
		} else {
			loadPhotos();
		}
		if (!reduceMotion) {
			scheduleNext();
		}
		refreshTimer = window.setInterval(loadPhotos, 5 * 60 * 1000);
		return () => {
			if (timer) {
				clearTimeout(timer);
			}
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
