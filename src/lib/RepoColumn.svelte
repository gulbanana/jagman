<script lang="ts">
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<div class="column">
	{@render children()}
</div>

<style>
	.column {
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
		min-height: 0;
		width: 256px;

		scrollbar-width: none;
		&::-webkit-scrollbar {
			display: none;
		}

		mask-image: linear-gradient(
			to bottom,
			black calc(100% - 64px),
			transparent
		);
	}
</style>
