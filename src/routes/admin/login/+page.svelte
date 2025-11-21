<script lang="ts">
	let { data, form } = $props();
</script>

<main class="admin-login">
	<h1>Admin login</h1>
	{#if !data.tokenConfigured}
		<p>ADMIN_TOKEN is not configured; any password will be accepted.</p>
	{/if}
	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}
	<form method="POST">
		<label>
			<span>Password</span>
			<input name="password" type="password" autocomplete="current-password" required />
		</label>
		<button type="submit">Sign in</button>
	</form>
</main>
