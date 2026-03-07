# Isolated Workspaces

## Summary

Isolated workspaces allow multiple agents to work on the same repository simultaneously without interfering with each other or the user's main checkout. Each JAGMAN-managed agent session runs in its own Jujutsu workspace — a separate directory with an independent working-copy commit — under `~/.config/jagman/workspaces/`. When an agent finishes, the user reviews its changes and either accepts them (rebasing onto the repo's branch point and advancing the bookmark) or rejects them (discarding the workspace).

## Background

**Jujutsu workspaces.** `jj workspace add` creates a new working copy that shares the same repo backend. Each workspace has its own working-copy commit. `jj workspace forget` removes the association without touching the commits themselves — they must be explicitly abandoned if unwanted. See the [jj docs](https://jj-vcs.github.io/jj/latest/working-copy/#workspaces) for details.

**libgg.** Workspace operations go through NAPI-RS wrappers around GG's `WorkerSession` API. See `src/AGENTS.md` for the native addon architecture and GG dependency.

**Attention system.** Attention items are in-memory objects in `app/lib/server/state.ts`, managed via `pushAttention()` and `resolveAttention()`. The client polls for updates via the `GET /attention` SSE endpoint. Each item has a `detail` discriminated union (`detail.type` is `"launch-prompt"` or `"idle-prompt"`), and the `AttentionCard` component renders the appropriate sub-component based on the type. The workspace feature's lifecycle transitions (launch-prompt → running → idle-prompt → accept/reject) are driven by pushing and resolving these items from server-side route handlers and background tasks.

**Agent session discovery.** Each agent backend implements `loadSessions(workspacePaths, maxSessions)`, which scans agent-specific data for sessions at the given paths. Claude's implementation (`app/lib/server/agent/claude.ts`) builds a project index by scanning `~/.claude/projects/` — each project directory corresponds to a working directory (matched by cwd recorded in the JSONL files). The aggregation layer in `getRepoSummary` (`app/lib/server/agent/index.ts`) calls all backends and merges results. With workspaces, the key challenge is that an agent running in `~/.config/jagman/workspaces/<uuid>` will have its session files indexed under that cwd, not the main repo path — so `loadSessions` must receive workspace paths in addition to the repo path, and `getRepoSummary` must know which workspaces belong to each repo.

## Concepts

### Sessions

A **session** is what the user sees in a RepoColumn. Sessions fall into three categories:

1. **Historical** — a past agent session that is no longer running but could be continued. Discovered by scanning agent-specific data (e.g. Claude's JSONL files).
2. **External** — an agent process currently running outside JAGMAN's control, detected via process inspection. These are always associated with the main repo checkout, never with JAGMAN workspaces.
3. **Managed** — an agent session launched and controlled by JAGMAN via an Agent SDK plugin. Always runs in an isolated workspace.

Sessions from all three categories are aggregated per-repo: sessions associated with any of a repo's JAGMAN workspaces appear in the same RepoColumn as sessions associated with the repo directly.

JAGMAN-managed agents are never "external" — they are always tracked via the agent task. External session detection (process scanning) only applies to the main repo checkout.

### Workspaces

A Jujutsu **workspace** is analogous to a Git worktree: a filesystem directory containing a checked-out copy of the code at some commit. JAGMAN only manages workspaces located at `~/.config/jagman/workspaces/<identifier>`. Each workspace's working-copy commit starts as a child of the repo's **branch point bookmark** (initially hardcoded to `master`).

A workspace may accumulate multiple commits during its lifetime — the user can manipulate commit history via the embedded GG views or external tools. When changes are accepted, the entire commit chain is rebased (analogous to `jj rebase -b`).

### Branch Point Bookmark

Each repository has a configured bookmark (initially `master`) that serves as the branch point for new workspaces. When a workspace's changes are accepted:

1. The workspace's commits are rebased onto the bookmark's current position (which may have moved since workspace creation).
2. The bookmark is advanced to the workspace's former working-copy commit.

This is equivalent to a fast-forward merge in Git, though Jujutsu does not require literal fast-forward — the bookmark simply moves to the rebased tip.

### Configured Copy Paths

Each repository has a list of **copy paths** — filesystem paths (relative to the repo root) that should be copied from the main checkout into new workspaces. These typically include:

- Build outputs (`target/`, `build/`, `dist/`)
- Dependency caches (`node_modules/`, `.venv/`)
- Local configuration files (`CLAUDE.local.md`, `.env.local`)

These are full copies, not symlinks.

## Session Lifecycle

### Creation

When the user clicks the "new session" button on a RepoCard:

1. A **workspace initialisation task** begins in the background. This creates the jj workspace (via libgg) and copies configured paths into it. Initialisation tasks are serialised — only one runs at a time across all repos — to avoid jj working-copy lock contention and to limit concurrent filesystem copies.
2. A **launch-prompt** attention card appears immediately, without waiting for initialisation.

The launch-prompt card has two halves:
- **Prompt half** — text input, mode selector (standard/plan/yolo), and action buttons (Launch, Cancel).
- **Config half** — initial configuration such as model selection and agent brand.

The user can then:
- **Cancel** — a background task waits for the initialisation task to complete (if still running), then removes the workspace. The attention card is resolved.
- **Launch** (submit a prompt) — a background task waits for the initialisation task to complete, then starts the agent via the SDK plugin with the given prompt and configuration.

### Running

While the agent is running, its session appears as a managed agent card in the RepoColumn with an animated border indicating token consumption. The detail pane shows the agent's streaming log.

For the initial implementation, the agent SDK is **fully stubbed**: it pretends to run for a short time, then transitions to idle.

### Idle

When the agent finishes a turn (or the stub completes), an **idle-prompt** attention card is pushed. This card has two halves:
- **Prompt half** — text input, mode selector, and action buttons (Send, Accept, Reject).
- **Revision half** — an embedded GG revision view showing the workspace's changes relative to the branch point.

The user can:
- **Send** — submit a new prompt, causing the agent task to continue with the given instructions.
- **Accept** — finalise the workspace's changes (see [Accepting Changes](#accepting-changes)).
- **Reject** — discard the workspace and all its changes (see [Rejecting Changes](#rejecting-changes)).

### Accepting Changes

When the user accepts a workspace's changes:

1. Rebase the workspace's commit chain onto the branch point bookmark's current position (using a `jj rebase -b` equivalent via libgg).
2. Advance the bookmark to the commit that was formerly the workspace's working-copy commit.
3. Reassociate the agent session with the main repository using agent-specific logic. For Claude, this means moving/modifying JSONL session files so they appear under the main repo's project directory.
4. Forget the jj workspace and remove the workspace directory.
5. The session now appears as a historical session in the RepoColumn.

### Rejecting Changes

When the user rejects a workspace's changes:

1. Forget the jj workspace (abandoning all its commits).
2. Remove the workspace directory.
3. The session is removed from the RepoColumn.

## Startup Reconciliation

On startup, JAGMAN discovers existing managed workspaces (however they are persisted — see [Open Questions](#open-questions)) and reconciles state:

- For each known workspace, check whether it still exists on disk and in jj.
- For each valid workspace, create a managed session and push an idle-prompt attention card so the user can continue, accept, or reject it.
- For orphaned workspaces (on disk but not in jj, or vice versa), clean them up.

This handles both normal restarts and crash recovery.

## UI

### Agent Card Borders

Agent cards use coloured, optionally animated borders to convey status. The existing mode-based colours (peach/blue/red) remain, with animation indicating active token use:

- **Managed running** — mode colour with animated spark.
- **Managed idle** — mode colour, static border.
- **External** — mode colour with animated spark (driven by process detection).
- **Historical** — no mode colour, static border.

### Attention Card Layout

Both launch-prompt and idle-prompt cards are wider than other attention cards, designed so that only one needs to be fully visible at a time. Each has a two-half layout:

| Card Type | Left Half | Right Half |
|---|---|---|
| **Launch-prompt** | Prompt input, mode selector, Launch/Cancel buttons | Agent brand, model selection, other initial config |
| **Idle-prompt** | Prompt input, mode selector, Send/Accept/Reject buttons | Embedded GG revision view of workspace changes |

### Detail Pane

No changes to the detail pane are required for the initial implementation. Selecting a managed session shows its log in the detail pane as with any other session.

---

## Implementation Status

### What Exists

**Workspace create/remove plumbing (partial).** The native addon (`src/lib.rs`) exposes `createWorkspace` and `removeWorkspace` via GG's `WorkerSession`. The TypeScript layer (`app/lib/server/gg.ts`) wraps these as `createAgentWorkspace` (generates a UUID, places workspace under `JAGMAN_WORKSPACES_DIR`) and `removeAgentWorkspace`. The `JAGMAN_WORKSPACES_DIR` constant is defined in `app/lib/server/paths.ts`.

Known issues with the current implementation:
- `createWorkspace` does not yet accept a branch point bookmark — it creates a workspace but may not parent the working-copy commit correctly.
- The workspaces root directory is not ensured at startup.

**Attention routes (partial).** Two API routes exist:
- `POST /attention/[id]/launch` — creates a workspace, builds a stub `RepoSessionSummary`, transitions from launch-prompt to idle-prompt.
- `POST /attention/[id]/done` — removes a workspace and resolves the attention item.

These need to change: launch should not block on workspace creation (it should be backgrounded), and done should be replaced by separate accept/reject actions.

**UI (partial).** `IdlePrompt.svelte` has a "Done" button calling the done endpoint, and `LaunchPrompt.svelte` has a "Launch" button calling the launch endpoint. Neither reads the textarea value — prompt text is not sent to the server. The attention cards do not yet have the two-half layout.

### What Needs to Change

**`createWorkspace` native function** — needs an additional parameter for the branch point bookmark so the workspace's working-copy commit is created as a child of that bookmark.

**Workspace directory setup** — `JAGMAN_WORKSPACES_DIR` must be created at startup (add to `ensureJagmanConfigDir` or a separate init step).

**Launch flow** — workspace creation must move to a background initialisation task. The launch and cancel actions must wait for the initialisation task before proceeding with agent start or workspace removal, respectively.

**Accept/reject** — replace the single "done" action with accept (rebase + bookmark advance + session reassociation + workspace removal) and reject (workspace removal only).

### What Needs to Be Built

**Initialisation task queue** — a serialised background task runner for workspace creation. One task at a time across all repos.

**Agent SDK control surface** — the `Agent` interface needs write/control capabilities (start, prompt, stop, reassociate). The exact API shape is TBD. For the initial implementation, all control is stubbed — the "agent" pretends to run briefly and then idles.

**Session discovery across workspaces** — `Agent.loadSessions` and `getRepoSummary` must scan workspace directories in addition to the main repo path, then merge results into a single session list per repo.

**Startup reconciliation** — discover existing managed workspaces on startup, recreate sessions and push idle-prompt attention cards for each.

**libgg extensions:**
- `listWorkspaces(repoPath)` — return workspace names/paths for a repository (GG has this internally).
- `rebaseWorkspace(repoPath, workspaceName, targetBookmark)` — rebase a workspace's commit chain onto the bookmark (equivalent to `jj rebase -b`).
- `advanceBookmark(repoPath, bookmark, toCommit)` — move a bookmark to a specific commit.

**`repository` table** — add a `copy_paths` column (JSON array of relative paths to copy into new workspaces, default `[]`).

**`AgentRepoSessionSummary.workspace` semantics** — currently populated with the repo path. Needs to distinguish main-repo sessions from workspace sessions (workspace identifier vs. repo path).

**Attention card UI** — two-half layout for launch-prompt and idle-prompt. Prompt text must be read and submitted. Idle-prompt needs an embedded GG revision view.

---

## Open Questions

### Workspace Persistence

How should JAGMAN track which workspaces belong to which repo?

**Option A: Database table.** A `repository_workspace` table with columns like `(repo_path, workspace_name, status)`. Explicit, queryable, can store additional metadata.

**Option B: Filesystem + libgg.** Use `listWorkspaces(repoPath)` to discover workspaces at startup, matching names against directories under `JAGMAN_WORKSPACES_DIR`. No extra table needed if the workspace name is the only metadata. Simpler, but relies on jj as the source of truth.

If workspace metadata beyond the name proves necessary (e.g. which agent brand created it, creation timestamp, associated session ID), Option A becomes more attractive. If the name and filesystem presence are sufficient, Option B avoids schema complexity.

### Workspace Naming

The current implementation uses a random UUID as the workspace name and directory name. Alternatives:

- **`jagman-<uuid>`** — prefixed for easy identification in `jj workspace list` output.
- **`jagman-<short-hash>`** — shorter, still unique enough for the small number of concurrent workspaces.
- **`jagman-<serial>`** — per-repo serial number, human-friendly but requires a counter somewhere.
- **`<repo-name>-<serial>`** — e.g. `jagman-3`, most readable in jj output.

The workspace name appears in `jj log` and `jj workspace list`, so readability has value. The directory name under `JAGMAN_WORKSPACES_DIR` does not need to be human-readable, so the workspace name and directory name could differ.
