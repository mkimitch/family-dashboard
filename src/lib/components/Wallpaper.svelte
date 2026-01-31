<script lang="ts">
	import { onMount } from "svelte";

	type PhotoList = { files: string[] };

	let { initialPhotos = [] } = $props();

	let files = $state<string[]>([]);
	let aFile = $state("");
	let bFile = $state("");
	let showA = $state(true);
	let index = $state(0);
	let timer: number | undefined;
	let refreshTimer: number | undefined;

	const MIN_INTERVAL_MS = 5 * 60 * 1000;
	const MAX_INTERVAL_MS = 10 * 60 * 1000;
	const FADE_MS = 1200;
	let reduceMotion = $state(false);

	const SIZES = "100vw";

	const detectUrlPrefix = (list: string[]): { urlPrefix: string; sized: boolean } => {
		const hasPhotosPrefix = list.some((v) => (v ?? "").includes("/photos/"));
		const hasKiosk = list.some((v) => (v ?? "").includes("/photos/kiosk/"));
		if (hasPhotosPrefix && !hasKiosk) return { urlPrefix: "/photos", sized: false };
		return { urlPrefix: "/photos/kiosk", sized: true };
	};

	const toFileName = (v: string): string => {
		// Accept "foo.jpg" or "/photos/kiosk/foo.jpg" etc
		const clean = (v ?? "").trim();
		if (!clean) return "";
		const parts = clean.split("/");
		return parts[parts.length - 1] ?? "";
	};

	let urlPrefix = $state("/photos/kiosk");
	let sized = $state(true);

	const makeSrc = (file: string): string => `${urlPrefix}/${file}`;

	const makeSrcSet = (file: string): string => {
		if (!sized) return "";
		return [`/photos/kiosk/${file} 1200w`, `/photos/mid/${file} 2560w`, `/photos/hq/${file} 3840w`].join(", ");
	};

	const loadPhotos = async () => {
		try {
			const r = await fetch("/api/photos", { cache: "no-store" });
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

			aFile = files[index % files.length] ?? "";
			bFile = ""; // avoid loading a second image immediately unless you want to

			const nextPrefetch = files[(index + 1) % files.length];
			if (nextPrefetch) prefetch(nextPrefetch);
		} catch {}
	}

	const prefetch = (file: string) => {
		const img = new Image();
		img.decoding = "async";
		img.sizes = SIZES;
		img.src = makeSrc(file); // fallback
		img.srcset = makeSrcSet(file);
	}

	const shuffle = <T>(arr: T[]): T[] => {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	const next = () => {
		if (!files.length) return;

		index = (index + 1) % files.length;
		const nextFile = files[index] ?? "";
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
	}

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
	}

	const handleError = () => {
		loadPhotos();
		next();
	}

	onMount(() => {
		reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

		if (Array.isArray(initialPhotos) && initialPhotos.length) {
			const layout = detectUrlPrefix(initialPhotos);
			urlPrefix = layout.urlPrefix;
			sized = layout.sized;
			const normalized = initialPhotos.map(toFileName).filter(Boolean);
			files = shuffle(normalized.slice());
			index = 0;

			aFile = files[index % files.length] ?? "";
			bFile = "";

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
	<img
		alt=""
		aria-hidden="true"
		class="wp wp-a"
		decoding="async"
		fetchpriority="high"
		loading="eager"
		on:error={handleError}
		sizes={SIZES}
		src={aFile ? makeSrc(aFile) : ""}
		srcset={aFile ? makeSrcSet(aFile) : ""}
		style:opacity={showA ? 1 : 0}
	/>
	<img
		alt=""
		aria-hidden="true"
		class="wp wp-b"
		decoding="async"
		fetchpriority="low"
		loading="lazy"
		on:error={handleError}
		sizes={SIZES}
		src={bFile ? makeSrc(bFile) : ""}
		srcset={bFile ? makeSrcSet(bFile) : ""}
		style:opacity={showA ? 0 : 1}
	/>
</div>
