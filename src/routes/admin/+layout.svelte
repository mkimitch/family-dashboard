<script lang="ts">
	let { children } = $props();
</script>

<div class="admin-root">
	<nav class="admin-nav">
		<a href="/admin">Overview</a>
		<a href="/admin/hero">Hero messages</a>
		<a href="/admin/countdowns">Countdowns</a>
		<a href="/admin/calendars">Calendars</a>
	</nav>
	<div class="admin-content">{@render children()}</div>
</div>
