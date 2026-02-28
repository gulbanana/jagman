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

	const modeRank: Record<SessionMode, number> = {
		plan: 1,
		standard: 2,
		yolo: 3,
	};

	const greatestMode = $derived(
		repo.sessions.reduce<SessionMode | null>((best, s) => {
			if (s.status === "inactive" || s.mode === null) return best;
			if (best === null) return s.mode;
			return modeRank[s.mode] > modeRank[best] ? s.mode : best;
		}, null),
	);

	const running = $derived(
		repo.sessions.filter(
			(s) => s.status === "running" || s.status === "external",
		).length,
	);
	const waiting = $derived(
		repo.sessions.filter((s) => s.status === "waiting").length,
	);
	const done = $derived(
		repo.sessions.filter((s) => s.status === "inactive").length,
	);
</script>

<button class="repo-header" {onclick}>
	<Pane stackedBelow>
		{#snippet header()}
			<span
				class="repo-name"
				class:standard={greatestMode === "standard"}
				class:plan={greatestMode === "plan"}
				class:yolo={greatestMode === "yolo"}>{repo.path}</span>
		{/snippet}
		<div class="repo-info">
			{#if running > 0}
				<span class="stat"
					><span class="dot dot-running"></span><span class="value"
						>{running}</span
					><span class="desc">running</span></span>
			{/if}
			{#if waiting > 0}
				<span class="stat"
					><span class="dot dot-waiting"></span><span class="value"
						>{waiting}</span
					><span class="desc">waiting</span></span>
			{/if}
			{#if done > 0}
				<span class="stat"
					><span class="dot dot-done"></span><span class="value"
						>{done}+</span
					><span class="desc">done</span></span>
			{/if}
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
	}

	.stat {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.value {
		font-family: var(--ff-code);
		font-size: var(--fs-content);
	}

	.desc {
		font-size: var(--fs-content);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 8px;
		flex-shrink: 0;
		align-self: center;
	}

	.dot-running {
		background: var(--ctp-green);
	}

	.dot-waiting {
		background: var(--ctp-yellow);
	}

	.dot-done {
		background: var(--ctp-overlay1);
	}

	.repo-errors {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
