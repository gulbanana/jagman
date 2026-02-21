<script lang="ts">
	import Pane from "./Pane.svelte";
	import type { Agent, Repo, Commit } from "$lib/types";

	let {
		agent = null,
		repo = null,
	}: {
		agent?: Agent | null;
		repo?: Repo | null;
	} = $props();

	const repoCommits: Commit[] = [
		{ hash: "ksqvpn", author: "you", message: "wip: layout prototyping", age: "2m ago" },
		{ hash: "rmzxtl", author: "claude-1", message: "refactor: extract validateCredentials", age: "5m ago" },
		{ hash: "yonwkp", author: "claude-2", message: "feat: search component scaffold", age: "8m ago" },
		{ hash: "vlmqst", author: "claude-3", message: "feat: dark mode support", age: "1h ago" },
		{ hash: "tpxwrn", author: "you", message: "merge: dark mode into main", age: "1h ago" },
		{ hash: "sqkzml", author: "claude-4", message: "fix: login redirect loop", age: "yesterday" },
		{ hash: "nwprtx", author: "opencode-2", message: "chore: update dependencies", age: "yesterday" }
	];

	const label = $derived(
		agent ? agent.name : repo ? repo.path : ""
	);
</script>

<Pane>
	{#snippet header()}
		<span class="label">{label}</span>
	{/snippet}

	{#if agent}
		<div class="log">
			{#each agent.log as line, i (i)}
				<div class="log-line">{line}</div>
			{/each}
		</div>
	{:else if repo}
		<div class="repo-detail">
			<div class="repo-meta">
				<span class="meta-item">Branch: <strong>{repo.branch}</strong></span>
				<span class="meta-item">{repo.agents.length} agent sessions</span>
				<span class="meta-item">{repo.agents.filter((a) => a.status !== "completed").length} active</span>
			</div>
			<div class="section-label">Recent changes</div>
			<div class="commits">
				{#each repoCommits as commit (commit.hash)}
					<div class="commit">
						<span class="commit-hash">{commit.hash}</span>
						<span class="commit-msg">{commit.message}</span>
						<span class="commit-meta">{commit.author} &middot; {commit.age}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</Pane>

<style>
	.label {
		font-family: var(--stack-code);
		font-weight: 600;
	}

	.log {
		font-family: var(--stack-code);
		font-size: 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.log-line {
		color: var(--ctp-subtext1);
		padding: 1px 4px;
	}

	.repo-detail {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.repo-meta {
		display: flex;
		gap: 16px;
		font-size: 13px;
		color: var(--ctp-subtext0);
	}

	.repo-meta strong {
		color: var(--ctp-text);
	}

	.section-label {
		font-family: var(--stack-industrial);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ctp-overlay2);
	}

	.commits {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.commit {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 8px;
		font-size: 13px;
		align-items: baseline;
	}

	.commit-hash {
		font-family: var(--stack-code);
		font-size: 12px;
		color: var(--ctp-mauve);
	}

	.commit-msg {
		color: var(--ctp-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.commit-meta {
		font-size: 12px;
		color: var(--ctp-overlay2);
		white-space: nowrap;
	}

</style>
