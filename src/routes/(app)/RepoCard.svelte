<script lang="ts">
	import ErrorSpan from "$lib/ErrorSpan.svelte";
	import Pane from "$lib/Pane.svelte";
	import type { Repo } from "$lib/messages";

	let {
		repo,
		onclick,
	}: {
		repo: Repo;
		onclick: () => void;
	} = $props();

	const hasActiveAgents = $derived(
		repo.sessions.some((a) => a.status !== "inactive"),
	);
</script>

<button class="repo-header" {onclick}>
	<Pane stackedBelow>
		{#snippet header()}
			<span class="repo-name" class:active={hasActiveAgents}
				>{repo.path}</span>
		{/snippet}
		<div class="repo-info">
			<span>{repo.sessions.length} sessions</span>
			<span>{repo.branch}</span>
		</div>
		{#if repo.errors.length > 0}
			<div class="repo-errors">
				{#each repo.errors as error}
					<ErrorSpan>[{error.brand}] {error.message}</ErrorSpan>
				{/each}
			</div>
		{/if}
	</Pane>
</button>

<style>
	.repo-header {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		text-align: left;
		color: var(--ctp-text);
	}

	.repo-header:hover {
		filter: brightness(0.95);
	}

	.repo-name {
		font-family: var(--stack-code);
		font-weight: 600;

		&.active {
			color: var(--ctp-peach);
		}
	}

	.repo-info {
		display: flex;
		gap: 16px;
		font-size: 12px;
		color: var(--ctp-subtext0);
	}

	.repo-errors {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
