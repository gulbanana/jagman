<script lang="ts">
	import type { AttentionItem } from "$lib/messages";
	import { overflowing } from "$lib/overflowing";
	import { attentionMeta } from "$lib/attention/meta";
	import Pane from "$lib/Pane.svelte";
	import AttentionCard from "./AttentionCard.svelte";
	import LaunchPrompt from "$lib/attention/LaunchPrompt.svelte";
	import IdlePrompt from "$lib/attention/IdlePrompt.svelte";

	let {
		items,
		onselect,
	}: {
		items: AttentionItem[];
		onselect: (item: AttentionItem) => void;
	} = $props();
</script>

<Pane>
	<div class="bar" use:overflowing>
		{#each items as item (item.id)}
			{@const meta = attentionMeta(item.detail)}
			<button class="card-button" onclick={() => onselect(item)}>
				<AttentionCard kind={meta.kind} title={meta.title} description={meta.description}>
					{#if item.detail.type === "launch-prompt"}
						<LaunchPrompt id={item.id} detail={item.detail} />
					{:else if item.detail.type === "idle-prompt"}
						<IdlePrompt id={item.id} detail={item.detail} />
					{/if}
				</AttentionCard>
			</button>
		{/each}
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

	.card-button {
		all: unset;
		cursor: pointer;
		display: contents;
	}
</style>
