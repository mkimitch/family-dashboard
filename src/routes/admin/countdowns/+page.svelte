<script lang="ts">
	import type { CountdownConfig, ScheduleRule } from '$lib/config/types';
	let { data, form } = $props();
	const countdowns: CountdownConfig[] = data.countdowns ?? [];
	const days: { value: number; label: string }[] = [
		{ value: 0, label: 'Sun' },
		{ value: 1, label: 'Mon' },
		{ value: 2, label: 'Tue' },
		{ value: 3, label: 'Wed' },
		{ value: 4, label: 'Thu' },
		{ value: 5, label: 'Fri' },
		{ value: 6, label: 'Sat' }
	];

	function firstSchedule(c: CountdownConfig | undefined): ScheduleRule | null {
		if (!c || !Array.isArray(c.schedules) || !c.schedules.length) return null;
		return c.schedules[0];
	}

	function isDaySelected(rule: ScheduleRule | null, day: number): boolean {
		if (!rule || !Array.isArray(rule.daysOfWeek)) return false;
		return rule.daysOfWeek.includes(day);
	}
</script>

<main class="admin-page admin-countdowns">
	<h1>Countdowns</h1>
	{#if form?.ok}
		<p class="status">Saved.</p>
	{/if}

	<section class="countdown-list">
		{#each countdowns as c}
			{@const rule = firstSchedule(c)}
			<details open>
				<summary>{c.label || '(untitled countdown)'}</summary>
				<form method="POST">
					<input type="hidden" name="intent" value="save" />
					<input type="hidden" name="id" value={c.id} />
					<input type="hidden" name="schedule_id" value={rule?.id ?? ''} />
					<div class="field-group">
						<label>
							<span>Label</span>
							<input name="label" type="text" value={c.label} required />
						</label>
						<label>
							<span>Target date/time</span>
							<input
								name="targetDateTime"
								type="datetime-local"
								value={c.targetDateTime}
								required
							/>
						</label>
					</div>
					<div class="field-group">
						<label>
							<span>Description</span>
							<textarea name="description" rows="2">{c.description ?? ''}</textarea>
						</label>
					</div>
					<div class="field-group">
						<label>
							<span>Priority</span>
							<input name="priority" type="number" value={c.priority ?? 0} />
						</label>
						<label class="checkbox-inline">
							<input name="enabled" type="checkbox" value="1" checked={c.enabled ?? true} />
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
					<div class="actions">
						<button type="submit">Save</button>
					</div>
				</form>
				<form method="POST" class="danger">
					<input type="hidden" name="intent" value="delete" />
					<input type="hidden" name="id" value={c.id} />
					<button type="submit">Delete</button>
				</form>
			</details>
		{/each}
	</section>

	<section class="countdown-new">
		<h2>New countdown</h2>
		<form method="POST">
			<input type="hidden" name="intent" value="save" />
			<div class="field-group">
				<label>
					<span>Label</span>
					<input name="label" type="text" required />
				</label>
				<label>
					<span>Target date/time</span>
					<input name="targetDateTime" type="datetime-local" required />
				</label>
			</div>
			<div class="field-group">
				<label>
					<span>Description</span>
					<textarea name="description" rows="2"></textarea>
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
			<div class="actions">
				<button type="submit">Create countdown</button>
			</div>
		</form>
	</section>
</main>
