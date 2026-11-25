<script lang="ts">
	import LottieWeatherIcon from '$lib/components/LottieWeatherIcon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let provider = $state('');
	let period = $state('');
	let status = $state('');
	let property = $state('');
	let page = $state(0);
	let copied = $state('');
	const pageSize = 12;
	const periods = $derived([...new Set(data.rows.map((row) => row.period.basis))].sort());
	const properties = $derived(
		[
			...new Set(
				data.rows.flatMap((row) => [
					...row.phenomena.map((event) => event.kind),
					...row.cloudCover.classes
				])
			)
		].sort()
	);
	let results = $derived(
		data.rows.filter((row) => {
			const native = row.source.native.map((item) => `${item.field} ${item.code ?? ''}`).join(' ');
			return (
				(!provider || row.source.provider === provider) &&
				(!period || row.period.basis === period) &&
				(!status || row.status === status) &&
				(!property ||
					row.cloudCover.classes.some((sky) => sky === property) ||
					row.phenomena.some((event) => event.kind === property)) &&
				`${native} ${row.description}`.toLowerCase().includes(query.trim().toLowerCase())
			);
		})
	);
	let pageCount = $derived(Math.max(1, Math.ceil(results.length / pageSize)));

	async function copyCondition(row: unknown) {
		try {
			await navigator.clipboard.writeText(JSON.stringify(row, null, 2));
			copied = 'Condition JSON copied';
		} catch {
			copied = 'Clipboard unavailable. Select the JSON to copy it.';
		}
	}
</script>

<svelte:head><title>Weather condition gallery</title></svelte:head>

<main>
	<h1>Weather condition gallery</h1>
	<div class="filters">
		<label
			>Search <input
				type="search"
				placeholder="Code, field or description"
				bind:value={query}
				oninput={() => (page = 0)}
			/></label
		>
		<label
			>Provider
			<select bind:value={provider} onchange={() => (page = 0)}>
				<option value="">All</option><option value="openweather">OpenWeather</option><option
					value="tomorrow">Tomorrow.io</option
				>
			</select>
		</label>
		<label
			>Period
			<select bind:value={period} onchange={() => (page = 0)}>
				<option value="">All</option>
				{#each periods as item (item)}<option value={item}>{item.replaceAll('_', ' ')}</option
					>{/each}
			</select>
		</label>
		<label
			>Mapping
			<select bind:value={status} onchange={() => (page = 0)}>
				<option value="">All</option><option>known</option><option>partial</option><option
					>unknown</option
				>
			</select>
		</label>
		<label
			>Property
			<select bind:value={property} onchange={() => (page = 0)}>
				<option value="">All</option>
				{#each properties as item (item)}<option value={item}>{item.replaceAll('_', ' ')}</option
					>{/each}
			</select>
		</label>
	</div>

	<p aria-live="polite">{results.length} conditions · Page {page + 1} of {pageCount}</p>
	<p role="status">{copied}</p>
	<div class="results">
		{#each results.slice(page * pageSize, (page + 1) * pageSize) as row (row)}
			{@const { presentation: display, assetExists, ...condition } = row}
			<article>
				<h2>{display.description}</h2>
				<LottieWeatherIcon src={display.path} ariaLabel="" className="gallery-animation" />
				<dl>
					<dt>Native evidence</dt>
					<dd>
						{row.source.provider} · {row.source.native
							.map((entry) => `${entry.field} ${entry.code ?? 'unavailable'}`)
							.join(', ')}
					</dd>
					<dt>Cloud cover</dt>
					<dd>
						{row.cloudCover.classes.join(', ') ||
							(row.cloudCover.mixed ? 'Mixed, classes unspecified' : 'Unspecified')}
					</dd>
					<dt>Phenomena</dt>
					<dd>
						{row.phenomena
							.map((event) =>
								[event.intensity, event.kind, ...event.qualifiers].filter(Boolean).join(' ')
							)
							.join(', ') || 'None specified'}
					</dd>
					<dt>Context and period</dt>
					<dd>{row.context} · {row.source.dataKind} · {row.period.basis}</dd>
					<dt>Displayed date and coverage</dt>
					<dd>
						{row.period.localDate ?? 'No date label'} · {row.period.start ?? 'Unknown start'} to {row
							.period.end ?? 'Unknown end'}
					</dd>
					<dt>Resolved asset</dt>
					<dd><code>{display.path}</code> · {assetExists ? 'Available' : 'Missing'}</dd>
					<dt>Mapping status</dt>
					<dd>{row.status}</dd>
					{#if display.approximation}<dt>Approximation</dt>
						<dd>{display.approximation}</dd>{/if}
				</dl>
				<details>
					<summary>Condition JSON</summary>
					<button onclick={() => copyCondition(condition)}>Copy JSON</button>
					<pre>{JSON.stringify(condition, null, 2)}</pre>
				</details>
			</article>
		{/each}
	</div>
	<nav aria-label="Gallery pages">
		<button onclick={() => (page -= 1)} disabled={page === 0}>Previous</button>
		<button onclick={() => (page += 1)} disabled={page + 1 >= pageCount}>Next</button>
	</nav>
</main>

<style>
	main {
		max-width: 90rem;
		margin: auto;
		padding: 1.25rem;
	}
	.filters,
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
	}
	.results {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
	}
	article {
		border: 1px solid currentColor;
		border-radius: 0.5rem;
		padding: 1rem;
		min-width: 0;
	}
	:global(.gallery-animation) {
		width: 5rem;
		height: 5rem;
	}
	dd {
		margin: 0 0 0.5rem;
		overflow-wrap: anywhere;
	}
	dt {
		font-weight: bold;
	}
	pre {
		max-height: 16rem;
		overflow: auto;
	}
	nav {
		margin-top: 1rem;
	}
</style>
