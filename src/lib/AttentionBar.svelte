<script lang="ts">
	import type { Snippet } from "svelte";
	import { overflowing } from "./overflowing";
	import Pane from "./Pane.svelte";

	let { children }: { children: Snippet } = $props();
</script>

<Pane>
	<div class="bar" use:overflowing>
		{@render children()}
	</div>
</Pane>

<style>
	.bar {
		display: flex;
		justify-content: start;
		align-items: stretch;
		height: 100%;
		gap: 8px;
		background: var(--ctp-mantle);
		overflow-x: auto;

		scrollbar-width: none;
		&::-webkit-scrollbar {
			display: none;
		}

		&:global([data-overflowing]) {
			mask-image: linear-gradient(
				to right,
				black calc(100% - 64px),
				transparent
			);
		}
	}
</style>
