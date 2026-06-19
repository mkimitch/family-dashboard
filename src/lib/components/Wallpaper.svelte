<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	type PhotoList = { files: string[] };

	let { initialPhotos = [] } = $props();

	let files = $state<string[]>([]);
	let aFile = $state('');
	let bFile = $state('');
	let showA = $state(true);
	let index = $state(0);
	let timer: number | undefined;
	let refreshTimer: number | undefined;

	// For production (5-10 minute intervals)
	const MIN_INTERVAL_MS = 5 * 60 * 1000;
	const MAX_INTERVAL_MS = 10 * 60 * 1000;

	// For debugging (quick changes)
	// const MIN_INTERVAL_MS = 5 * 1000;
	// const MAX_INTERVAL_MS = 10 * 1000;

	const FADE_MS = 1200;
	let reduceMotion = $state(false);
	const fadeOptions = $derived({ duration: reduceMotion ? 0 : FADE_MS });

	const SIZES = '100vw';

	const detectUrlPrefix = (list: string[]): { urlPrefix: string; sized: boolean } => {
		const hasPhotosPrefix = list.some((v) => (v ?? '').includes('/photos/'));
		const hasKiosk = list.some((v) => (v ?? '').includes('/photos/kiosk/'));
		if (hasPhotosPrefix && !hasKiosk) return { urlPrefix: '/photos', sized: false };
		return { urlPrefix: '/photos/kiosk', sized: true };
	};

	const toFileName = (v: string): string => {
		// Accept "foo.jpg" or "/photos/kiosk/foo.jpg" etc
		const clean = (v ?? '').trim();
		if (!clean) return '';
		const parts = clean.split('/');
		return parts[parts.length - 1] ?? '';
	};

	let urlPrefix = $state('/photos/kiosk');
	let sized = $state(true);

	const makeSrc = (file: string): string => `${urlPrefix}/${file}`;

	const makeSrcSet = (file: string): string => {
		if (!sized) return '';
		return [
			`/photos/kiosk/${file} 1200w`,
			`/photos/mid/${file} 2560w`,
			`/photos/hq/${file} 3840w`
		].join(', ');
	};

	const loadPhotos = async () => {
		try {
			const r = await fetch('/api/photos', { cache: 'no-store' });
			if (!r.ok) return;

			const data = (await r.json()) as PhotoList;
			const listRaw = Array.isArray(data?.files) ? data.files.slice() : [];
			const layout = detectUrlPrefix(listRaw);
			urlPrefix = layout.urlPrefix;
			sized = layout.sized;
			const list = listRaw.map(toFileName).filter(Boolean);

			if (!list.length) return;

			files = shuffle(list);
			index = 0;
			showA = true;

			aFile = files[index % files.length] ?? '';
			bFile = ''; // avoid loading a second image immediately unless you want to

			const nextPrefetch = files[(index + 1) % files.length];
			if (nextPrefetch) prefetch(nextPrefetch);
		} catch {
			// Keep the current wallpaper if a background photo refresh fails.
		}
	};

	const prefetch = (file: string) => {
		const img = new Image();
		img.decoding = 'async';
		img.sizes = SIZES;
		img.src = makeSrc(file); // fallback
		img.srcset = makeSrcSet(file);
	};

	const shuffle = <T,>(arr: T[]): T[] => {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	};

	const next = () => {
		if (!files.length) return;

		index = (index + 1) % files.length;
		const nextFile = files[index] ?? '';
		if (!nextFile) return;

		if (showA) {
			bFile = nextFile;
			showA = false;
		} else {
			aFile = nextFile;
			showA = true;
		}

		const nextPrefetch = files[(index + 1) % files.length];
		if (nextPrefetch) prefetch(nextPrefetch);
	};

	const scheduleNext = () => {
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
	};

	const handleError = () => {
		loadPhotos();
		next();
	};

	onMount(() => {
		reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

		if (Array.isArray(initialPhotos) && initialPhotos.length) {
			const layout = detectUrlPrefix(initialPhotos);
			urlPrefix = layout.urlPrefix;
			sized = layout.sized;
			const normalized = initialPhotos.map(toFileName).filter(Boolean);
			files = shuffle(normalized.slice());
			index = 0;

			aFile = files[index % files.length] ?? '';
			bFile = '';

			const nextPrefetch = files[(index + 1) % files.length];
			if (nextPrefetch) prefetch(nextPrefetch);
		} else {
			loadPhotos();
		}

		if (!reduceMotion) scheduleNext();

		refreshTimer = window.setInterval(loadPhotos, 5 * 60 * 1000);

		return () => {
			if (timer) clearTimeout(timer);
			if (refreshTimer) clearInterval(refreshTimer);
		};
	});
</script>

<div class="wallpaper" aria-hidden="true">
	{#if showA && aFile}
		<img
			alt=""
			aria-hidden="true"
			class="wp wp-a"
			decoding="async"
			fetchpriority="high"
			loading="eager"
			onerror={handleError}
			sizes={SIZES}
			src={makeSrc(aFile)}
			srcset={makeSrcSet(aFile)}
			transition:fade={fadeOptions}
		/>
	{/if}

	{#if !showA && bFile}
		<img
			alt=""
			aria-hidden="true"
			class="wp wp-b"
			decoding="async"
			fetchpriority="low"
			loading="lazy"
			onerror={handleError}
			sizes={SIZES}
			src={makeSrc(bFile)}
			srcset={makeSrcSet(bFile)}
			transition:fade={fadeOptions}
		/>
	{/if}
</div>

<style>
	.wallpaper {
		display: grid;
		grid-template-columns: 1fr;
		grid-column: 1;
		grid-row: 1;
		height: var(--wp-height, 60vh);
		overflow: hidden;
		position: relative;
		z-index: 0;

		& .wp {
			grid-column: 1;
			grid-row: 1;
			filter: saturate(1.05) brightness(0.85);
			height: var(--wp-height, 60vh);
			inset: 0;
			object-fit: cover;
			object-position: var(--wp-x, 50%) var(--wp-y, 50%);
			position: relative;
			width: 100%;
		}

		&::after {
			background: linear-gradient(
				to bottom,
				transparent 75%,
				color-mix(in oklch, var(--bg), transparent 0%) 100%
			);
			content: '';
			inset: 0;
			pointer-events: none;
			position: absolute;
			z-index: 1;
		}
	}
</style>
