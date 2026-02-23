<script lang="ts">
	import ErrorSpan from "$lib/ErrorSpan.svelte";
	import Pane from "$lib/Pane.svelte";
	import type { Repo, SessionMode } from "$lib/messages";

	let {
		repo,
		onclick,
	}: {
		repo: Repo;
		onclick: () => void;
	} = $props();

	const modeRank: Record<SessionMode, number> = { plan: 1, standard: 2, yolo: 3 };

	const greatestMode = $derived(
		repo.sessions.reduce<SessionMode | null>((best, s) => {
			if (s.status === "inactive" || s.mode === null) return best;
			if (best === null) return s.mode;
			return modeRank[s.mode] > modeRank[best] ? s.mode : best;
		}, null),
	);
</script>

<button class="repo-header" {onclick}>
	<Pane stackedBelow>
		{#snippet header()}
			<span class="repo-name" class:standard={greatestMode === "standard"} class:plan={greatestMode === "plan"} class:yolo={greatestMode === "yolo"}
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

		&.standard {
			color: var(--ctp-peach);
		}

		&.plan {
			color: var(--ctp-blue);
		}

		&.yolo {
			color: var(--ctp-red);
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
