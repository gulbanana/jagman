<script lang="ts">
    import Icon from "$lib/Icon.svelte";
    import Pane from "$lib/Pane.svelte";
    import { overflowing } from "$lib/overflowing";
    import { getRepos, getAttentionCards } from "./data.remote";
    import { brandIcons, type AgentBrand } from "$lib/brands";
    import AttentionBar from "./AttentionBar.svelte";
    import AttentionCard from "./AttentionCard.svelte";
    import RepoColumn from "./RepoColumn.svelte";
    import RepoCard from "./RepoCard.svelte";
    import AgentCard from "./AgentCard.svelte";
    import ErrorSpan from "$lib/ErrorSpan.svelte";

    type Selection =
        | { kind: "agent"; brand: AgentBrand; id: string }
        | { kind: "repo"; path: string };

    const reposQuery = getRepos();
    const repos = $derived(reposQuery.current ?? []);

    const cardsQuery = getAttentionCards();
    const cards = $derived(cardsQuery.current ?? []);

    let selection: Selection | null = $state(null);

    const allAgents = $derived(repos.flatMap((r) => r.sessions));

    const detailSrc = $derived.by(() => {
        const s = selection;
        if (!s) return `/detail/empty`;
        return s.kind === "agent"
            ? `/detail/agent/${s.id}`
            : `/detail/repo/${s.path}`;
    });

    const detailLabel = $derived.by(() => {
        const s = selection;
        if (!s) return "";
        if (s.kind === "agent") {
            return allAgents.find((a) => a.id === s.id)?.title;
        }
        return s.path;
    });

    const detailIcon = $derived.by(() => {
        const s = selection;
        if (!s) return null;
        return s.kind === "agent"
            ? { kind: "brand" as const, ...brandIcons[s.brand] }
            : { kind: "feather" as const, name: "git-branch" };
    });

    function selectAgent(brand: AgentBrand, id: string) {
        selection = { kind: "agent", brand, id };
    }

    function selectRepo(path: string) {
        selection = { kind: "repo", path };
    }

    let iframeLoading = $state(false);

    $effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        detailSrc;
        iframeLoading = true;
    });

    $effect(() => {
        if (selection === null && repos.length > 0) {
            selection = { kind: "repo", path: repos[0].path };
        }
    });
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
                        <button class="mock-btn mock-btn-approve"
                            >Approve</button>
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
                        <button class="mock-btn mock-btn-approve"
                            >Approve</button>
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
                        <button class="mock-btn mock-btn-approve"
                            >Launch</button>
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
                            <span class="mock-review-stat mock-diff-add"
                                >+48</span>
                        </div>
                        <div class="mock-review-file">
                            <span class="mock-review-name"
                                >src/routes/index.ts</span>
                            <span class="mock-review-stat mock-diff-add"
                                >+4</span>
                            <span class="mock-review-stat mock-diff-del"
                                >−2</span>
                        </div>
                        <div class="mock-review-file">
                            <span class="mock-review-name">src/config.ts</span>
                            <span class="mock-review-stat mock-diff-add"
                                >+1</span>
                        </div>
                    </div>
                    <div class="mock-actions">
                        <button class="mock-btn mock-btn-approve"
                            >Accept</button>
                        <button class="mock-btn mock-btn-deny">Reject</button>
                    </div>
                </AttentionCard>
            {/if}
        {/each}
    </AttentionBar>

    <div class="bottom">
        <div class="repos" use:overflowing>
            {#if reposQuery.error}
                <div class="status-message">
                    <ErrorSpan>
                        Failed to load repositories: {reposQuery.error.message}
                    </ErrorSpan>
                </div>
            {:else if reposQuery.loading}
                <div class="status-message">Loading...</div>
            {:else}
                <svelte:boundary>
                    {#each repos as repo (repo.path)}
                        <RepoColumn>
                            <RepoCard
                                {repo}
                                onclick={() => selectRepo(repo.path)} />

                            {#each repo.sessions as session (session.id)}
                                <AgentCard
                                    {session}
                                    selected={selection?.kind === "agent" &&
                                        selection.id === session.id}
                                    onclick={() =>
                                        selectAgent(
                                            session.brand,
                                            session.id,
                                        )} />
                            {/each}
                        </RepoColumn>
                    {/each}
                    {#snippet failed(error)}
                        <div class="status-message">
                            <ErrorSpan>
                                Render error: {error instanceof Error
                                    ? error.message
                                    : error}
                            </ErrorSpan>
                        </div>
                    {/snippet}
                </svelte:boundary>
            {/if}
        </div>

        <div class="detail">
            <Pane flush={selection?.kind === "repo"}>
                {#snippet header()}
                    {#if detailIcon?.kind === "brand"}
                        <picture>
                            <source
                                srcset={detailIcon.dark}
                                media="(prefers-color-scheme: dark)" />
                            <img
                                src={detailIcon.light}
                                alt="repository"
                                width="16"
                                height="16" />
                        </picture>
                    {:else if detailIcon?.kind === "feather"}
                        <Icon name={detailIcon.name} />
                    {/if}
                    <div class="detail-label">{detailLabel}</div>
                {/snippet}
                <div class="iframe-container">
                    <iframe
                        src={detailSrc}
                        title="Detail pane"
                        onload={() => (iframeLoading = false)}></iframe>
                    {#if iframeLoading}
                        <div class="iframe-overlay">Loading...</div>
                    {/if}
                </div>
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

    .iframe-container {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .detail iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    .iframe-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ctp-crust);
        color: var(--ctp-subtext0);
        font-family: var(--ff-ui);
    }

    .detail-label {
        font-family: var(--ff-code);
        font-weight: 600;

        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .status-message {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        color: var(--ctp-subtext0);
        font-family: var(--ff-ui);
    }

    /* Mock attention card content */

    .mock-command {
        flex: 1;
        margin: 0;
        padding: 8px;
        border-radius: 4px;
        background: var(--ctp-mantle);
        font-family: var(--ff-code);
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
        font-family: var(--ff-code);
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
        font-family: var(--ff-code);
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
        font-family: var(--ff-code);
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
        font-family: var(--ff-ui);
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
