<script lang="ts">
	import ErrorSpan from "$lib/ErrorSpan.svelte";
	import IdentSpan from "$lib/IdentSpan.svelte";
	import Pane from "$lib/Pane.svelte";
	import type { RepoSummary, SessionMode } from "$lib/messages";

	let {
		displayPath,
		selected = false,
		repo = null,
		onclick,
	}: {
		displayPath: string;
		selected?: boolean;
		repo?: RepoSummary | null;
		onclick: () => void;
	} = $props();

	const modeRank: Record<SessionMode, number> = {
		plan: 1,
		standard: 2,
		yolo: 3,
	};

	const greatestMode = $derived(
		repo
			? repo.sessions.reduce<SessionMode | null>((best, s) => {
					if (s.status === "inactive" || s.mode === null) return best;
					if (best === null) return s.mode;
					return modeRank[s.mode] > modeRank[best] ? s.mode : best;
				}, null)
			: null,
	);

	const running = $derived(
		repo
			? repo.sessions.filter(
					(s) => s.status === "running" || s.status === "external",
				).length
			: 0,
	);
	const waiting = $derived(
		repo ? repo.sessions.filter((s) => s.status === "waiting").length : 0,
	);
	const done = $derived(
		repo ? repo.sessions.filter((s) => s.status === "inactive").length : 0,
	);
</script>

<button class="repo-header" class:selected {onclick}>
	<Pane stackedBelow>
		{#snippet header()}
			<div
				class="repo-name"
				class:standard={greatestMode === "standard"}
				class:plan={greatestMode === "plan"}
				class:yolo={greatestMode === "yolo"}>
				<IdentSpan>{displayPath}</IdentSpan>
			</div>
		{/snippet}
		{#if repo}
			<div class="repo-info">
				{#if running > 0}
					<span class="stat"
						><span class="dot dot-running"></span><span
							class="value">{running}</span
						><span class="desc">running</span></span>
				{/if}
				{#if waiting > 0}
					<span class="stat"
						><span class="dot dot-waiting"></span><span
							class="value">{waiting}</span
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
		{:else}
			<div class="loading-state">Loading...</div>
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
		/* text-align: left; */
		color: var(--ctp-text);
		/* font-family: var(--ff-code); */
	}

	.repo-header:hover {
		filter: brightness(0.9);
	}

	.repo-header.selected {
		filter: brightness(0.8);
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

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--ff-ui);
		color: var(--ctp-subtext0);
	}
</style>
