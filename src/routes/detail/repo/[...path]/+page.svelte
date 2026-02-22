<script lang="ts">
	import { page } from "$app/state";
	import ErrorSpan from "$lib/ErrorSpan.svelte";
	import { getRepoDetail } from "./data.remote";

	const detailQuery = getRepoDetail(page.params.path ?? "");
	const detail = $derived(detailQuery.current);
</script>

{#if detailQuery.error}
	<div class="status">
		<ErrorSpan
			>{detailQuery.error.message ??
				"Failed to load repository."}</ErrorSpan>
	</div>
{:else if detailQuery.loading}
	<div class="status">Loading...</div>
{:else if detail}
	<svelte:boundary>
		<div class="content">
			<div class="repo-meta">
				<span>Branch: <strong>{detail.repo.branch}</strong></span>
				<span>{detail.repo.sessions.length} agent sessions</span>
				<span
					>{detail.repo.sessions.filter(
						(a) => a.status !== "inactive",
					).length} active</span>
			</div>
			<div class="section-label">Recent changes</div>
			<div class="commits">
				{#each detail.commits as commit (commit.hash)}
					<div class="commit">
						<span class="commit-hash">{commit.hash}</span>
						<span class="commit-msg">{commit.message}</span>
						<span class="commit-meta"
							>{commit.author} &middot; {commit.age}</span>
					</div>
				{/each}
			</div>
		</div>
		{#snippet failed(error)}
			<div class="status">
				<ErrorSpan>
					Render error: {error instanceof Error
						? error.message
						: error}
				</ErrorSpan>
			</div>
		{/snippet}
	</svelte:boundary>
{/if}

<style>
	.status {
		color: var(--ctp-subtext0);
		font-family: var(--stack-ui);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
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
