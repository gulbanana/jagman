<script lang="ts">
	import EventHeader from "$lib/EventHeader.svelte";
	import type { Snippet } from "svelte";

	let {
		kind,
		title,
		description,
		children,
	}: {
		kind: string;
		title: string;
		description: string;
		children?: Snippet;
	} = $props();
</script>

<div class="card">
	<EventHeader>{kind}</EventHeader>
	<div class="title">{title}</div>
	<div class="description">{description}</div>
	{#if children}
		<div class="body">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		padding: 8px 16px;
		border: 2px solid var(--ctp-overlay0);
		border-radius: 8px;
		background: var(--ctp-mantle);
		min-width: 512px;
	}

	.title {
		margin: 4px 0;
	}

	.description {
		font-family: var(--ff-code);
		font-size: var(--fs-content);
		color: var(--ctp-subtext0);
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-top: 8px;
	}
</style>
