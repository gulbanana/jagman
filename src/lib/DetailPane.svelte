<script lang="ts">
	import Pane from "./Pane.svelte";

	type Agent = {
		id: string;
		name: string;
		status: "running" | "waiting" | "completed";
		detail: string;
		log: string[];
	};

	type Repo = {
		path: string;
		branch: string;
		agents: { id: string; name: string; status: string }[];
	};

	type Event = {
		time: string;
		text: string;
	};

	type Commit = {
		hash: string;
		author: string;
		message: string;
		age: string;
	};

	let {
		agent = null,
		repo = null,
		events,
		onclose
	}: {
		agent?: Agent | null;
		repo?: Repo | null;
		events: Event[];
		onclose: () => void;
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
		agent ? agent.name : repo ? repo.path : "Activity"
	);

	const showClose = $derived(agent !== null || repo !== null);
</script>

<Pane>
	{#snippet header()}
		<span class="header-row">
			<span class="label">{label}</span>
			{#if showClose}
				<button class="close" onclick={onclose}>&times;</button>
			{/if}
		</span>
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
	{:else}
		<div class="events">
			{#each events as event, i (i)}
				<div class="event">
					<span class="time">{event.time}</span>
					<span class="text">{event.text}</span>
				</div>
			{/each}
		</div>
	{/if}
</Pane>

<style>
	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.label {
		font-family: var(--stack-code);
		font-weight: 600;
	}

	.close {
		background: none;
		border: none;
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
		color: var(--ctp-subtext0);
		padding: 0 4px;
	}

	.close:hover {
		color: var(--ctp-text);
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

	.events {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.event {
		display: flex;
		gap: 16px;
		font-size: 13px;
	}

	.time {
		font-family: var(--stack-code);
		font-size: 12px;
		color: var(--ctp-overlay2);
		white-space: nowrap;
	}

	.text {
		color: var(--ctp-subtext1);
	}
</style>
