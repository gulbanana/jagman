<script lang="ts">
	import type { Snippet } from "svelte";
	import { overflowing } from "./overflowing";

	let { children }: { children: Snippet } = $props();
</script>

<div class="column" use:overflowing>
	{@render children()}
</div>

<style>
	.column {
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
		min-height: 0;
		min-width: 256px;
		max-width: 256px;

		scrollbar-width: none;
		&::-webkit-scrollbar {
			display: none;
		}

		&:global([data-overflowing]) {
			mask-image: linear-gradient(
				to bottom,
				black calc(100% - 64px),
				transparent
			);
		}
	}
</style>
