<script lang="ts">
	import ErrorSpan from "$lib/ErrorSpan.svelte";

	let { children } = $props();
</script>

<div class="detail-frame">
	<svelte:boundary>
		{@render children()}
		{#snippet pending()}
			<div class="status">Loading...</div>
		{/snippet}
		{#snippet failed(error)}
			<div class="status">
				<ErrorSpan>
					{error instanceof Error ? error.message : error}
				</ErrorSpan>
			</div>
		{/snippet}
	</svelte:boundary>
</div>

<style>
	.detail-frame {
		background: var(--ctp-crust);
		min-height: 100vh;
		overflow: hidden;
	}

	.status {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		font-family: var(--ff-ui);
		color: var(--ctp-subtext0);
	}
</style>
