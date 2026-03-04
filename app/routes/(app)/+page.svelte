<script lang="ts">
    import FeatherIcon from "$lib/FeatherIcon.svelte";
    import Pane from "$lib/Pane.svelte";
    import { overflowing } from "$lib/overflowing";
    import { getRepoStubs, getAttentionItems } from "./data.remote";
    import {
        ActiveOrder,
        activeFirstCompare,
        type RepoActivitySignal,
    } from "$lib/activity";
    import { brandIcons, type AgentBrand } from "$lib/brands";
    import type { AttentionItem } from "$lib/messages";
    import AttentionBar from "./AttentionBar.svelte";
    import RepoColumn from "./RepoColumn.svelte";
    import RepoCard from "./RepoCard.svelte";
    import RepoColumnContent from "./RepoColumnContent.svelte";
    import ErrorSpan from "$lib/ErrorSpan.svelte";
    import IdentSpan from "$lib/IdentSpan.svelte";
    import type { Selection } from "./RepoColumn.svelte";
    import BrandIcon from "$lib/BrandIcon.svelte";

    const repoPathsPromise = $derived(getRepoStubs());
    const itemsPromise = $derived(getAttentionItems());

    const repoPaths = $derived(await repoPathsPromise);
    const items = $derived(await itemsPromise);

    let selection: Selection | null = $state(null);

    // Activity-based repo sorting
    const repoSignals = new Map<string, RepoActivitySignal>();
    let repoSignalVersion = $state(0);
    const repoOrder = new ActiveOrder();

    function handleRepoLoaded(signal: RepoActivitySignal) {
        const existing = repoSignals.get(signal.path);
        if (
            existing &&
            existing.active === signal.active &&
            existing.timestamp === signal.timestamp
        ) {
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
            return activeFirstCompare(
                activeIndex,
                a.path,
                aTime,
                b.path,
                bTime,
            );
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
        return s.kind === "agent" ? "user" : "git-branch";
    });

    function selectAgent(brand: AgentBrand, id: string, title: string) {
        selection = { kind: "agent", brand, id, title };
    }

    function selectRepo(path: string) {
        selection = { kind: "repo", path };
    }

    function handleAttentionSelect(item: AttentionItem) {
        if (item.detail.type === "idle-prompt") {
            selectAgent(
                item.detail.agent.brand,
                item.detail.agent.id,
                item.detail.agent.title,
            );
        }
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

    $effect(() => {
        const source = new EventSource("/attention");

        source.addEventListener("attention", () => {
            getAttentionItems().refresh();
        });

        return () => {
            source.close();
        };
    });
</script>

<div class="layout">
    <AttentionBar {items} onselect={handleAttentionSelect} />

    <div class="bottom">
        <div class="repos" use:overflowing>
            {#each sortedStubs as stub (stub.path)}
                <RepoColumn {selection} displayPath={stub.displayPath}>
                    {#snippet children(repoSelected, selectedAgentId)}
                        <svelte:boundary>
                            <RepoColumnContent
                                {stub}
                                {selectedAgentId}
                                {repoSelected}
                                onloaded={handleRepoLoaded}
                                onselectrepo={() =>
                                    selectRepo(stub.displayPath)}
                                onselectagent={selectAgent} />
                            {#snippet pending()}
                                <RepoCard
                                    displayPath={stub.displayPath}
                                    repoPath={stub.path}
                                    selected={repoSelected}
                                    onclick={() =>
                                        selectRepo(stub.displayPath)} />
                            {/snippet}
                            {#snippet failed(error)}
                                <RepoCard
                                    displayPath={stub.displayPath}
                                    repoPath={stub.path}
                                    selected={repoSelected}
                                    onclick={() =>
                                        selectRepo(stub.displayPath)} />
                                <div class="status-message">
                                    <ErrorSpan>
                                        {error instanceof Error
                                            ? error.message
                                            : error}
                                    </ErrorSpan>
                                </div>
                            {/snippet}
                        </svelte:boundary>
                    {/snippet}
                </RepoColumn>
            {/each}
        </div>

        <div class="detail">
            <Pane flush={selection?.kind === "repo"}>
                {#snippet header()}
                    {#if detailIcon}
                        <div class="detail-header">
                            <FeatherIcon name={detailIcon} />
                            <IdentSpan text={detailLabel} />
                        </div>
                    {/if}
                {/snippet}
                <div class="iframe-container">
                    <iframe
                        src={detailSrc}
                        title="Detail pane"
                        onload={() => (iframeLoading = false)}></iframe>
                    {#if iframeLoading}
                        <div class="iframe-overlay">Loading...</div>
                    {:else if selection?.kind == "agent"}
                        <BrandIcon brand={selection.brand} />
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

    .detail-header {
        display: grid;
        gap: 8px;
        grid-template-columns: auto 1fr;
        overflow: hidden;
    }

    .iframe-container {
        position: relative;
        width: 100%;
        height: 100%;

        & > :global(picture) {
            position: absolute;
            bottom: 0;
            left: 0;
        }
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

    .status-message {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        color: var(--ctp-subtext0);
        font-family: var(--ff-ui);
    }
</style>
