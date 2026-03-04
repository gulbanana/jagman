<script lang="ts">
	import type { Snippet } from "svelte";
	import { overflowing } from "$lib/overflowing";
	import type { AgentBrand } from "$lib/brands";

	export type Selection =
		| { kind: "agent"; brand: AgentBrand; id: string; title: string }
		| { kind: "repo"; path: string };

	let {
		selection,
		displayPath,
		children,
	}: {
		selection: Selection | null;
		displayPath: string;
		children: Snippet<[boolean, string | null]>;
	} = $props();

	const repoSelected = $derived(
		selection?.kind === "repo" && selection.path === displayPath,
	);
	const selectedAgentId = $derived(
		selection?.kind === "agent" ? selection.id : null,
	);
</script>

<div class="column" use:overflowing>
	{@render children(repoSelected, selectedAgentId)}
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
