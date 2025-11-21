<script lang="ts">
	import type { HeroMessageConfig, ScheduleRule } from '$lib/config/types';
	let { data, form } = $props();
	const heroes: HeroMessageConfig[] = data.heroes ?? [];
	const days: { value: number; label: string }[] = [
		{ value: 0, label: 'Sun' },
		{ value: 1, label: 'Mon' },
		{ value: 2, label: 'Tue' },
		{ value: 3, label: 'Wed' },
		{ value: 4, label: 'Thu' },
		{ value: 5, label: 'Fri' },
		{ value: 6, label: 'Sat' }
	];

	function firstSchedule(h: HeroMessageConfig | undefined): ScheduleRule | null {
		if (!h || !Array.isArray(h.schedules) || !h.schedules.length) return null;
		return h.schedules[0];
	}

	function isDaySelected(rule: ScheduleRule | null, day: number): boolean {
		if (!rule || !Array.isArray(rule.daysOfWeek)) return false;
		return rule.daysOfWeek.includes(day);
	}
</script>

<main class="admin-page admin-hero">
	<h1>Hero messages</h1>
	{#if form?.ok}
		<p class="status">Saved.</p>
	{/if}

	<section class="hero-list">
		{#each heroes as h}
			{@const rule = firstSchedule(h)}
			<details open>
				<summary>{h.title || '(untitled hero)'}</summary>
				<form method="POST">
					<input type="hidden" name="intent" value="save" />
					<input type="hidden" name="id" value={h.id} />
					<input type="hidden" name="schedule_id" value={rule?.id ?? ''} />
					<div class="field-group">
						<label>
							<span>Title</span>
							<input name="title" type="text" value={h.title} required />
						</label>
						<label>
							<span>Subtitle</span>
							<input name="subtitle" type="text" value={h.subtitle ?? ''} />
						</label>
					</div>
					<div class="field-group">
						<label>
							<span>Alerts (one per line)</span>
							<textarea name="alerts" rows="3">{h.alerts?.join('\n') ?? ''}</textarea>
						</label>
					</div>
					<div class="field-group">
						<label>
							<span>Priority</span>
							<input name="priority" type="number" value={h.priority ?? 0} />
						</label>
						<label class="checkbox-inline">
							<input name="enabled" type="checkbox" value="1" checked={h.enabled ?? true} />
							<span>Enabled</span>
						</label>
					</div>
					<fieldset class="field-group">
						<legend>Schedule</legend>
						<div class="field-group">
							<label>
								<span>Start date</span>
								<input name="schedule_startDate" type="date" value={rule?.startDate ?? ''} />
							</label>
							<label>
								<span>End date</span>
								<input name="schedule_endDate" type="date" value={rule?.endDate ?? ''} />
							</label>
						</div>
						<div class="field-group">
							<label>
								<span>Start time</span>
								<input name="schedule_startTime" type="time" value={rule?.startTime ?? ''} />
							</label>
							<label>
								<span>End time</span>
								<input name="schedule_endTime" type="time" value={rule?.endTime ?? ''} />
							</label>
						</div>
						<div class="days-grid">
							{#each days as d}
								<label class="checkbox-inline">
									<input
										name="schedule_days"
										type="checkbox"
										value={d.value}
										checked={isDaySelected(rule, d.value)}
									/>
									<span>{d.label}</span>
								</label>
							{/each}
						</div>
					</fieldset>
					<fieldset class="field-group">
						<legend>Wallpaper override</legend>
						<div class="field-group">
							<label>
								<span>Mode</span>
								<select name="wallpaperMode" bind:value={h.wallpaperMode}>
									<option value="default">Use default wallpaper</option>
									<option value="override">Override with specific photos</option>
								</select>
							</label>
						</div>
						<div class="field-group">
							<label>
								<span>Override photo URLs (one per line)</span>
								<textarea name="wallpaperPhotos" rows="3">
									{h.wallpaperPhotos?.join('\n') ?? ''}
								</textarea>
							</label>
						</div>
					</fieldset>
					<div class="actions">
						<button type="submit">Save</button>
					</div>
				</form>
				<form method="POST" class="danger">
					<input type="hidden" name="intent" value="delete" />
					<input type="hidden" name="id" value={h.id} />
					<button type="submit">Delete</button>
				</form>
			</details>
		{/each}
	</section>

	<section class="hero-new">
		<h2>New hero message</h2>
		<form method="POST">
			<input type="hidden" name="intent" value="save" />
			<div class="field-group">
				<label>
					<span>Title</span>
					<input name="title" type="text" required />
				</label>
				<label>
					<span>Subtitle</span>
					<input name="subtitle" type="text" />
				</label>
			</div>
			<div class="field-group">
				<label>
					<span>Alerts (one per line)</span>
					<textarea name="alerts" rows="3"></textarea>
				</label>
			</div>
			<div class="field-group">
				<label>
					<span>Priority</span>
					<input name="priority" type="number" value="0" />
				</label>
				<label class="checkbox-inline">
					<input name="enabled" type="checkbox" value="1" checked />
					<span>Enabled</span>
				</label>
			</div>
			<fieldset class="field-group">
				<legend>Schedule</legend>
				<div class="field-group">
					<label>
						<span>Start date</span>
						<input name="schedule_startDate" type="date" />
					</label>
					<label>
						<span>End date</span>
						<input name="schedule_endDate" type="date" />
					</label>
				</div>
				<div class="field-group">
					<label>
						<span>Start time</span>
						<input name="schedule_startTime" type="time" />
					</label>
					<label>
						<span>End time</span>
						<input name="schedule_endTime" type="time" />
					</label>
				</div>
				<div class="days-grid">
					{#each days as d}
						<label class="checkbox-inline">
							<input name="schedule_days" type="checkbox" value={d.value} />
							<span>{d.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>
			<fieldset class="field-group">
				<legend>Wallpaper override</legend>
				<div class="field-group">
					<label>
						<span>Mode</span>
						<select name="wallpaperMode">
							<option value="default">Use default wallpaper</option>
							<option value="override">Override with specific photos</option>
						</select>
					</label>
				</div>
				<div class="field-group">
					<label>
						<span>Override photo URLs (one per line)</span>
						<textarea name="wallpaperPhotos" rows="3"></textarea>
					</label>
				</div>
			</fieldset>
			<div class="actions">
				<button type="submit">Create hero message</button>
			</div>
		</form>
	</section>
</main>
