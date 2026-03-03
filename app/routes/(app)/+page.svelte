<script lang="ts">
    import Icon from "$lib/Icon.svelte";
    import Pane from "$lib/Pane.svelte";
    import { overflowing } from "$lib/overflowing";
    import { getRepoStubs, getAttentionCards } from "./data.remote";
    import { ActiveOrder, activeFirstCompare, type RepoActivitySignal } from "$lib/activity";
    import { brandIcons, type AgentBrand } from "$lib/brands";
    import AttentionBar from "./AttentionBar.svelte";
    import AttentionCard from "./AttentionCard.svelte";
    import RepoColumn from "./RepoColumn.svelte";
    import RepoCard from "./RepoCard.svelte";
    import RepoColumnContent from "./RepoColumnContent.svelte";
    import ControlButton from "$lib/ControlButton.svelte";
    import ErrorSpan from "$lib/ErrorSpan.svelte";

    type Selection =
        | { kind: "agent"; brand: AgentBrand; id: string; title: string }
        | { kind: "repo"; path: string };

    const repoPathsPromise = $derived(getRepoStubs());
    const cardsPromise = $derived(getAttentionCards());

    const repoPaths = $derived(await repoPathsPromise);
    const cards = $derived(await cardsPromise);

    let selection: Selection | null = $state(null);

    // Activity-based repo sorting
    const repoSignals = new Map<string, RepoActivitySignal>();
    let repoSignalVersion = $state(0);
    const repoOrder = new ActiveOrder();

    function handleRepoLoaded(signal: RepoActivitySignal) {
        const existing = repoSignals.get(signal.path);
        if (existing && existing.active === signal.active && existing.timestamp === signal.timestamp) {
            return;
        }
        repoSignals.set(signal.path, signal);
        repoSignalVersion++;
    }

    const sortedStubs = $derived.by(() => {
        // Touch the version counter to establish reactivity
        void repoSignalVersion;

        const stubs = [...repoPaths];
        const activePaths = stubs
            .filter((s) => repoSignals.get(s.path)?.active)
            .map((s) => s.path);
        const activeIndex = repoOrder.update(activePaths);

        stubs.sort((a, b) => {
            const aTime = repoSignals.get(a.path)?.timestamp ?? 0;
            const bTime = repoSignals.get(b.path)?.timestamp ?? 0;
            return activeFirstCompare(activeIndex, a.path, aTime, b.path, bTime);
        });

        return stubs;
    });

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
            return s.title;
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

    function selectAgent(brand: AgentBrand, id: string, title: string) {
        selection = { kind: "agent", brand, id, title };
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
        if (selection === null && repoPaths.length > 0) {
            selection = { kind: "repo", path: repoPaths[0].displayPath };
        }
    });
</script>

<div class="layout">
    <AttentionBar>
        {#each cards as card, i (i)}
            {#if card.type === "permission-command"}
                <AttentionCard
                    kind="Permission"
                    title="opencode-3 wants to run a command"
                    description="~/projects/api-server">
                    <pre class="mock-command">npm test</pre>
                    <div class="mock-actions">
                        <ControlButton intent="approve">Approve</ControlButton>
                        <ControlButton intent="deny">Deny</ControlButton>
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
                        <ControlButton intent="approve">Approve</ControlButton>
                        <ControlButton intent="deny">Deny</ControlButton>
                    </div>
                </AttentionCard>
            {:else if card.type === "idle-prompt"}
                <AttentionCard
                    kind="Prompt"
                    title="New task for api-server"
                    description="claude-12 · ~/projects/api-server">
                    <textarea
                        class="mock-input"
                        placeholder="Enter a prompt for the agent..."
                        >Add rate limiting to public endpoints</textarea>
                    <div class="mock-actions">
                        <ControlButton intent="approve">Launch</ControlButton>
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
                        <ControlButton intent="approve">Accept</ControlButton>
                        <ControlButton intent="deny">Reject</ControlButton>
                    </div>
                </AttentionCard>
            {/if}
        {/each}
    </AttentionBar>

    <div class="bottom">
        <div class="repos" use:overflowing>
            {#each sortedStubs as stub (stub.path)}
                <RepoColumn>
                    <svelte:boundary>
                        <RepoColumnContent
                            {stub}
                            selectedAgentId={selection?.kind === "agent"
                                ? selection.id
                                : null}
                            onloaded={handleRepoLoaded}
                            onselectrepo={() => selectRepo(stub.displayPath)}
                            onselectagent={selectAgent} />
                        {#snippet pending()}
                            <RepoCard
                                displayPath={stub.displayPath}
                                onclick={() => selectRepo(stub.displayPath)} />
                        {/snippet}
                        {#snippet failed(error)}
                            <RepoCard
                                displayPath={stub.displayPath}
                                onclick={() => selectRepo(stub.displayPath)} />
                            <div class="status-message">
                                <ErrorSpan>
                                    {error instanceof Error
                                        ? error.message
                                        : error}
                                </ErrorSpan>
                            </div>
                        {/snippet}
                    </svelte:boundary>
                </RepoColumn>
            {/each}
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
        height: 100%;
        display: grid;
        grid-template-rows: 1fr minmax(0, 2fr);
        overflow: hidden;
    }

    .bottom {
        display: grid;
        grid-template-columns: auto minmax(512px, 50%);
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
</style>
