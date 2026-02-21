<script lang="ts">
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<div class="bar">
	{@render children()}
</div>

<style>
	.bar {
		display: flex;
		align-items: start;
		gap: 16px;
		padding: 8px;
		border: 2px solid var(--ctp-overlay0);
		border-radius: 8px;
		background: var(--ctp-crust);
		overflow-x: auto;
	}
</style>
