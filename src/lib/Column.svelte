<script lang="ts">
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<div class="box">
	{@render children()}
</div>

<style>
	.box {
		padding: 8px;

		border: 2px solid;
		border-radius: 8px;

		border-color: var(--ctp-overlay0);
		background-color: var(--ctp-crust);
	}
</style>
