<script lang="ts">
    import AttentionBar from "$lib/AttentionBar.svelte";
    import AttentionCard from "$lib/AttentionCard.svelte";
    import RepoColumn from "$lib/RepoColumn.svelte";
    import AgentCard from "$lib/AgentCard.svelte";
    import DetailPane from "$lib/DetailPane.svelte";
    import Pane from "$lib/Pane.svelte";

    type Agent = {
        id: string;
        name: string;
        status: "running" | "waiting" | "completed";
        mode?: "standard" | "plan" | "yolo";
        detail: string;
        log: string[];
    };

    type Repo = {
        path: string;
        branch: string;
        agents: Agent[];
    };

    type Selection =
        | { kind: "agent"; id: string }
        | { kind: "repo"; path: string };

    const repos: Repo[] = [
        {
            path: "~/projects/webapp",
            branch: "main",
            agents: [
                {
                    id: "a1",
                    name: "claude-1",
                    status: "running",
                    mode: "standard",
                    detail: "refactoring auth module",
                    log: [
                        "[14:32:01] Reading src/auth/login.ts",
                        "[14:32:03] Reading src/auth/session.ts",
                        "[14:32:05] Editing src/auth/login.ts — extracting validateCredentials()",
                        "[14:32:08] Editing src/auth/session.ts — updating imports",
                        "[14:32:10] Running npm test",
                        "[14:32:15] 42 tests passed, 0 failed",
                        "[14:32:16] Editing src/auth/login.ts — adding error handling",
                    ],
                },
                {
                    id: "a2",
                    name: "claude-2",
                    status: "running",
                    mode: "plan",
                    detail: "adding search feature",
                    log: [
                        "[14:28:00] Reading src/components/SearchBar.svelte",
                        "[14:28:05] Creating src/lib/search.ts",
                        "[14:28:12] Editing src/routes/+page.svelte",
                    ],
                },
                {
                    id: "a3",
                    name: "opencode-1",
                    status: "waiting",
                    mode: "yolo",
                    detail: "deleting hard drive",
                    log: [
                        "[14:25:00] Editing src/lib/api.ts",
                        "[14:25:08] Bypassing permission: rm -rf /",
                    ],
                },
                {
                    id: "a4",
                    name: "claude-3",
                    status: "completed",
                    detail: "added dark mode",
                    log: ["[13:45:00] Task completed"],
                },
                {
                    id: "a5",
                    name: "claude-4",
                    status: "completed",
                    detail: "fixed login redirect bug",
                    log: ["[yesterday] Task completed"],
                },
                {
                    id: "a6",
                    name: "opencode-2",
                    status: "completed",
                    detail: "updated dependencies",
                    log: ["[yesterday] Task completed"],
                },
                {
                    id: "a7",
                    name: "claude-5",
                    status: "completed",
                    detail: "refactored API client",
                    log: ["[2 days ago] Task completed"],
                },
                {
                    id: "a8",
                    name: "claude-6",
                    status: "completed",
                    detail: "added list pagination",
                    log: ["[3 days ago] Task completed"],
                },
            ],
        },
        {
            path: "~/projects/api-server",
            branch: "develop",
            agents: [
                {
                    id: "b1",
                    name: "opencode-3",
                    status: "waiting",
                    mode: "standard",
                    detail: "needs permission",
                    log: [
                        "[14:30:00] Reading src/routes/users.ts",
                        "[14:30:05] Editing src/routes/users.ts",
                        "[14:30:08] Requesting permission: run npm test",
                    ],
                },
                {
                    id: "b2",
                    name: "claude-7",
                    status: "completed",
                    detail: "added rate limiting",
                    log: ["[1 hour ago] Task completed"],
                },
                {
                    id: "b3",
                    name: "claude-8",
                    status: "completed",
                    detail: "fixed CORS config",
                    log: ["[yesterday] Task completed"],
                },
                {
                    id: "b4",
                    name: "opencode-4",
                    status: "completed",
                    detail: "added health check endpoint",
                    log: ["[2 days ago] Task completed"],
                },
                {
                    id: "b5",
                    name: "claude-9",
                    status: "completed",
                    detail: "wrote migration scripts",
                    log: ["[3 days ago] Task completed"],
                },
            ],
        },
        {
            path: "~/projects/docs-site",
            branch: "main",
            agents: [
                {
                    id: "c1",
                    name: "claude-10",
                    status: "completed",
                    detail: "rewrote getting started guide",
                    log: ["[2 days ago] Task completed"],
                },
                {
                    id: "c2",
                    name: "claude-11",
                    status: "completed",
                    detail: "added API reference section",
                    log: ["[3 days ago] Task completed"],
                },
                {
                    id: "c3",
                    name: "opencode-5",
                    status: "completed",
                    detail: "fixed broken links",
                    log: ["[4 days ago] Task completed"],
                },
            ],
        },
    ];

    const allAgents = repos.flatMap((r) => r.agents);

    const events = [
        { time: "14:32:16", text: "claude-1 is editing src/auth/login.ts" },
        { time: "14:30:08", text: "opencode-3 is waiting for permission" },
        {
            time: "14:28:12",
            text: "claude-2 is editing src/routes/+page.svelte",
        },
        { time: "14:25:08", text: "opencode-1 is waiting for permission" },
        { time: "13:45:00", text: "claude-3 completed dark mode task" },
        { time: "13:40:12", text: "claude-7 completed rate limiting" },
        { time: "13:32:00", text: "claude-1 started on webapp" },
    ];

    let selection: Selection | null = $state(null);

    const selectedAgent = $derived.by(() => {
        const sel = selection;
        return sel?.kind === "agent"
            ? (allAgents.find((a) => a.id === sel.id) ?? null)
            : null;
    });

    const selectedRepo = $derived.by(() => {
        const sel = selection;
        return sel?.kind === "repo"
            ? (repos.find((r) => r.path === sel.path) ?? null)
            : null;
    });

    function selectAgent(id: string) {
        selection =
            selection?.kind === "agent" && selection.id === id
                ? null
                : { kind: "agent", id };
    }

    function selectRepo(path: string) {
        selection =
            selection?.kind === "repo" && selection.path === path
                ? null
                : { kind: "repo", path };
    }

    function hasActiveAgents(repo: Repo): boolean {
        return repo.agents.some((a) => a.status !== "completed");
    }
</script>

<div class="layout">
    <AttentionBar>
        <AttentionCard
            kind="Permission"
            title="opencode-3 wants to run a command"
            description="npm test" />
        <AttentionCard
            kind="Permission"
            title="opencode-1 wants to run a command"
            description="npm test" />
        <AttentionCard
            kind="Prompt"
            title="New task for api-server"
            description="Add rate limiting to public endpoints" />
    </AttentionBar>

    <div class="bottom">
        <div class="repos">
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
        </div>

        <div class="detail">
            <DetailPane
                agent={selectedAgent}
                repo={selectedRepo}
                {events}
                onclose={() => (selection = null)} />
        </div>
    </div>
</div>

<style>
    .layout {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        overflow: hidden;
        gap: 32px;
        margin: 32px;
    }

    .bottom {
        display: grid;
        grid-template-columns: 3fr 1fr;
        gap: 32px;
        min-height: 0;
    }

    .repos {
        display: flex;
        gap: 32px;
        overflow-x: auto;
        min-width: 0;

        scrollbar-width: none;
        &::-webkit-scrollbar {
            display: none;
        }

        mask-image: linear-gradient(
            to right,
            black calc(100% - 64px),
            transparent
        );
    }

    .detail {
        display: flex;
        flex-direction: column;
    }

    .detail > :global(*) {
        flex: 1;
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
</style>
