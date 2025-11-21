<script lang="ts">
	import type { CalendarConfig, CalendarOverlayEvent } from '$lib/config/types';
	let { data, form } = $props();
	const remote: any[] = (data.remoteCalendars as any[]) ?? [];
	const configs: CalendarConfig[] = (data.configs as CalendarConfig[]) ?? [];
	const overlays: CalendarOverlayEvent[] = (data.overlays as CalendarOverlayEvent[]) ?? [];

	function findConfig(id: string): CalendarConfig | undefined {
		return configs.find((c) => c.id === id);
	}

	function calendarIdOf(c: any): string {
		return (c?.id ?? c?.calendarId ?? c?.name ?? c?.label ?? '').trim();
	}

	function displayNameOf(c: any, cfg: CalendarConfig | undefined): string {
		if (cfg?.name) return cfg.name;
		const raw = (c?.label ?? c?.name ?? calendarIdOf(c) ?? '').trim();
		return raw || '(unnamed calendar)';
	}
</script>

<main class="admin-page admin-calendars">
	<h1>Calendars & overlays</h1>
	{#if form?.ok}
		<p class="status">Saved.</p>
	{/if}

	<section class="calendar-configs">
		<h2>Calendars</h2>
		{#if !remote.length}
			<p>No remote calendars discovered yet. Ensure CAL_URL / CAL_CALENDARS_URL is configured.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Color</th>
						<th>Icon</th>
						<th>Sort</th>
						<th>Enabled</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each remote as r}
						{@const id = calendarIdOf(r)}
						{@const cfg = findConfig(id)}
						{#if id}
							<tr>
								<td>{id}</td>
								<td>
									<form method="POST">
										<input type="hidden" name="intent" value="saveConfig" />
										<input type="hidden" name="id" value={id} />
										<input
											name="name"
											type="text"
											value={cfg?.name ?? ''}
											placeholder={displayNameOf(r, cfg)}
										/>
									</form></td
								>
								<td>
									<input
										name="color"
										type="text"
										value={cfg?.color ?? ''}
										placeholder={r?.color ?? r?.calendarColor ?? '#888'}
									/>
								</td>
								<td>
									<input
										name="icon"
										type="text"
										value={cfg?.icon ?? ''}
										placeholder={r?.icon ?? ''}
									/>
								</td>
								<td>
									<input name="sortOrder" type="number" value={cfg?.sortOrder ?? ''} min="0" />
								</td>
								<td>
									<label class="checkbox-inline">
										<input
											name="enabled"
											type="checkbox"
											value="1"
											checked={cfg ? cfg.enabled : true}
										/>
										<span>Enabled</span>
									</label>
								</td>
								<td>
									<button type="submit">Save</button>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section class="calendar-overlays">
		<h2>Overlay events</h2>
		{#if !overlays.length}
			<p>No overlay events defined yet.</p>
		{/if}
		{#each overlays as ev}
			<details open>
				<summary>{ev.title} ({ev.startDate}{ev.endDate ? ` → ${ev.endDate}` : ''})</summary>
				<form method="POST">
					<input type="hidden" name="intent" value="saveOverlay" />
					<input type="hidden" name="id" value={ev.id} />
					<div class="field-group">
						<label>
							<span>Title</span>
							<input name="title" type="text" value={ev.title} required />
						</label>
						<label>
							<span>Calendar ID</span>
							<input name="calendarId" type="text" value={ev.calendarId ?? ''} />
						</label>
					</div>
					<div class="field-group">
						<label>
							<span>Start date</span>
							<input name="startDate" type="date" value={ev.startDate} required />
						</label>
						<label>
							<span>End date</span>
							<input name="endDate" type="date" value={ev.endDate ?? ''} />
						</label>
					</div>
					<label class="checkbox-inline">
						<input name="allDay" type="checkbox" value="1" checked={ev.allDay ?? true} />
						<span>All day</span>
					</label>
					<div class="actions">
						<button type="submit">Save</button>
					</div>
				</form>
				<form method="POST" class="danger">
					<input type="hidden" name="intent" value="deleteOverlay" />
					<input type="hidden" name="id" value={ev.id} />
					<button type="submit">Delete</button>
				</form>
			</details>
		{/each}

		<section class="overlay-new">
			<h3>New overlay event</h3>
			<form method="POST">
				<input type="hidden" name="intent" value="saveOverlay" />
				<div class="field-group">
					<label>
						<span>Title</span>
						<input name="title" type="text" required />
					</label>
					<label>
						<span>Calendar ID</span>
						<input name="calendarId" type="text" />
					</label>
				</div>
				<div class="field-group">
					<label>
						<span>Start date</span>
						<input name="startDate" type="date" required />
					</label>
					<label>
						<span>End date</span>
						<input name="endDate" type="date" />
					</label>
				</div>
				<label class="checkbox-inline">
					<input name="allDay" type="checkbox" value="1" checked />
					<span>All day</span>
				</label>
				<div class="actions">
					<button type="submit">Create overlay</button>
				</div>
			</form>
		</section>
	</section>
</main>
