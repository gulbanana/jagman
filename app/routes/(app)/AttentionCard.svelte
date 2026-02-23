<script lang="ts">
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
	<div class="kind">{kind}</div>
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

	.kind {
		font-family: var(--ff-industrial);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ctp-overlay2);
		margin-bottom: 2px;
	}

	.title {
		font-family: var(--ff-ui);
		font-size: 14px;
		font-weight: 600;
		color: var(--ctp-text);
	}

	.description {
		font-family: var(--ff-code);
		font-size: 12px;
		color: var(--ctp-subtext0);
		margin-top: 2px;
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-top: 8px;
	}
</style>
