<script lang="ts">
    import AttentionBar from "$lib/AttentionBar.svelte";
    import AttentionCard from "$lib/AttentionCard.svelte";
    import RepoColumn from "$lib/RepoColumn.svelte";
    import AgentCard from "$lib/AgentCard.svelte";
    import Pane from "$lib/Pane.svelte";
    import { overflowing } from "$lib/overflowing";
    import type { Repo } from "$lib/types";
    import { getRepos, getAttentionCards } from "./data.remote";

    type Selection =
        | { kind: "agent"; id: string }
        | { kind: "repo"; path: string };

    const reposQuery = getRepos();
    const repos = $derived(reposQuery.current ?? []);

    const cardsQuery = getAttentionCards();
    const cards = $derived(cardsQuery.current ?? []);

    let selection: Selection = $state({ kind: "agent", id: "a1" });

    const allAgents = $derived(repos.flatMap((r) => r.agents));

    const detailSrc = $derived.by(() => {
        const s = selection;
        return s.kind === "agent"
            ? `/detail/agent/${s.id}`
            : `/detail/repo/${s.path}`;
    });

    const detailLabel = $derived.by(() => {
        const s = selection;
        if (s.kind === "agent") {
            return allAgents.find((a) => a.id === s.id)?.name ?? s.id;
        }
        return s.path;
    });

    function selectAgent(id: string) {
        selection = { kind: "agent", id };
    }

    function selectRepo(path: string) {
        selection = { kind: "repo", path };
    }

    function hasActiveAgents(repo: Repo): boolean {
        return repo.agents.some((a) => a.status !== "completed");
    }
</script>

<div class="layout">
    <AttentionBar>
        {#each cards as card (card.type)}
            {#if card.type === "permission-command"}
                <AttentionCard
                    kind="Permission"
                    title="opencode-3 wants to run a command"
                    description="~/projects/api-server">
                    <pre class="mock-command">npm test</pre>
                    <div class="mock-actions">
                        <button class="mock-btn mock-btn-approve">Approve</button>
                        <button class="mock-btn mock-btn-deny">Deny</button>
                    </div>
                </AttentionCard>
            {:else if card.type === "permission-edit"}
                <AttentionCard
                    kind="Permission"
                    title="opencode-1 wants to edit a file"
                    description="~/projects/webapp">
                    <pre class="mock-diff"><span class="mock-diff-file"
                            >src/lib/api.ts</span>
<span class="mock-diff-del">- const timeout = 5000;</span>
<span class="mock-diff-add">+ const timeout = 30000;</span></pre>
                    <div class="mock-actions">
                        <button class="mock-btn mock-btn-approve">Approve</button>
                        <button class="mock-btn mock-btn-deny">Deny</button>
                    </div>
                </AttentionCard>
            {:else if card.type === "prompt"}
                <AttentionCard
                    kind="Prompt"
                    title="New task for api-server"
                    description="claude-12 · ~/projects/api-server">
                    <textarea
                        class="mock-input"
                        placeholder="Enter a prompt for the agent..."
                        >Add rate limiting to public endpoints</textarea>
                    <div class="mock-actions">
                        <button class="mock-btn mock-btn-approve">Launch</button>
                    </div>
                </AttentionCard>
            {:else if card.type === "review"}
                <AttentionCard
                    kind="Review"
                    title="claude-7 finished a task"
                    description="~/projects/api-server · 3 files changed">
                    <div class="mock-review">
                        <div class="mock-review-file">
                            <span class="mock-review-name"
                                >src/middleware/rateLimit.ts</span>
                            <span class="mock-review-stat mock-diff-add">+48</span>
                        </div>
                        <div class="mock-review-file">
                            <span class="mock-review-name">src/routes/index.ts</span>
                            <span class="mock-review-stat mock-diff-add">+4</span>
                            <span class="mock-review-stat mock-diff-del">−2</span>
                        </div>
                        <div class="mock-review-file">
                            <span class="mock-review-name">src/config.ts</span>
                            <span class="mock-review-stat mock-diff-add">+1</span>
                        </div>
                    </div>
                    <div class="mock-actions">
                        <button class="mock-btn mock-btn-approve">Accept</button>
                        <button class="mock-btn mock-btn-deny">Reject</button>
                    </div>
                </AttentionCard>
            {/if}
        {/each}
    </AttentionBar>

    <div class="bottom">
        <div class="repos" use:overflowing>
            {#if reposQuery.error}
                <div class="status-message">Failed to load repositories.</div>
            {:else if reposQuery.loading}
                <div class="status-message">Loading...</div>
            {:else}
                {#each repos as repo (repo.path)}
                    <RepoColumn>
                        <button
                            class="repo-header"
                            onclick={() => selectRepo(repo.path)}>
                            <Pane
                                stackedBelow
                                borderColor={hasActiveAgents(repo)
                                    ? "var(--ctp-peach)"
                                    : undefined}>
                                {#snippet header()}
                                    <span class="repo-name">{repo.path}</span>
                                {/snippet}
                                <div class="repo-info">
                                    <span>{repo.agents.length} agents</span>
                                    <span>{repo.branch}</span>
                                </div>
                            </Pane>
                        </button>

                        {#each repo.agents as agent (agent.id)}
                            <AgentCard
                                name={agent.name}
                                status={agent.status}
                                mode={agent.mode}
                                detail={agent.detail}
                                selected={selection?.kind === "agent" &&
                                    selection.id === agent.id}
                                onclick={() => selectAgent(agent.id)} />
                        {/each}
                    </RepoColumn>
                {/each}
            {/if}
        </div>

        <div class="detail">
            <Pane>
                {#snippet header()}
                    <span class="detail-label">{detailLabel}</span>
                {/snippet}
                <iframe src={detailSrc} title="Detail pane"></iframe>
            </Pane>
        </div>
    </div>
</div>

<style>
    .layout,
    .bottom,
    .repos {
        gap: 32px;
    }
    @media (max-width: 1919px) {
        .layout,
        .bottom,
        .repos {
            gap: 16px;
        }
    }

    .layout {
        display: grid;
        grid-template-rows: 1fr minmax(0, 2fr);
        overflow: hidden;
    }

    .bottom {
        display: grid;
        grid-template-columns: auto minmax(512px, 1fr);
        min-height: 0;
    }

    .repos {
        display: flex;
        overflow-x: auto;
        min-width: 0;

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

    .detail {
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .detail > :global(*) {
        flex: 1;
    }

    .detail iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    .detail-label {
        font-family: var(--stack-code);
        font-weight: 600;
    }

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
    }

    .repo-info {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: var(--ctp-subtext0);
    }

    .status-message {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        color: var(--ctp-subtext0);
        font-family: var(--stack-ui);
    }

    /* Mock attention card content */

    .mock-command {
        flex: 1;
        margin: 0;
        padding: 8px;
        border-radius: 4px;
        background: var(--ctp-mantle);
        font-family: var(--stack-code);
        font-size: 13px;
        color: var(--ctp-text);
        white-space: pre-wrap;
    }

    .mock-diff {
        flex: 1;
        margin: 0;
        padding: 8px;
        border-radius: 4px;
        background: var(--ctp-mantle);
        font-family: var(--stack-code);
        font-size: 12px;
        color: var(--ctp-text);
        line-height: 1.4;
        white-space: pre-wrap;
    }

    .mock-diff-file {
        color: var(--ctp-subtext0);
    }

    .mock-diff-add {
        color: var(--ctp-green);
    }

    .mock-diff-del {
        color: var(--ctp-red);
    }

    .mock-input {
        flex: 1;
        resize: none;
        padding: 8px;
        border: 1px solid var(--ctp-overlay0);
        border-radius: 4px;
        background: var(--ctp-mantle);
        font-family: var(--stack-code);
        font-size: 13px;
        color: var(--ctp-text);
    }

    .mock-input::placeholder {
        color: var(--ctp-overlay1);
    }

    .mock-review {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .mock-review-file {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 4px 8px;
        border-radius: 4px;
        background: var(--ctp-mantle);
        font-family: var(--stack-code);
        font-size: 12px;
    }

    .mock-review-name {
        flex: 1;
        color: var(--ctp-text);
    }

    .mock-review-stat {
        font-size: 11px;
    }

    .mock-actions {
        display: flex;
        justify-content: end;
        gap: 8px;
        margin-top: 8px;
    }

    .mock-btn {
        padding: 4px 16px;
        border: none;
        border-radius: 4px;
        font-family: var(--stack-ui);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
    }

    .mock-btn-approve {
        background: var(--ctp-green);
        color: var(--ctp-base);
    }

    .mock-btn-deny {
        background: var(--ctp-surface1);
        color: var(--ctp-text);
    }
</style>
