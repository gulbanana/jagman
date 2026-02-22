# ADR 0003: Surface errors to users

## Status

Accepted

## Context

JAGMAN integrates with external systems — agent SDKs, HTTP servers, the filesystem — any of which can fail at runtime. The initial implementation wrapped most external calls in `try/catch` blocks that returned fallback values (empty arrays, null) on failure. This made the UI resilient to errors but invisible to them: when the OpenCode agent failed to connect, the dashboard silently showed zero sessions with no indication that anything was wrong.

JAGMAN is a local developer tool. Its users are the developers who run it. They are capable of diagnosing runtime problems — a misconfigured SDK, a missing server process, a bad API response — as long as they can see the error. Silent fallbacks waste their time by hiding the symptom.

## Decision

Errors should propagate rather than be caught and discarded. The guiding principle is: **surface errors as close to the user as possible.**

### Server side

Agent implementations (OpenCode, Claude, future agents) must not silently swallow errors from external calls. If an SDK call or network request fails, the error propagates up to the orchestration layer (`agent.ts`).

The orchestration layer provides **per-agent isolation**: one agent failing does not prevent others from loading. When isolation requires catching an error internally, the error information must be **carried forward to the client** rather than logged to the server console. `console.error` is not a side channel the user can see — the dashboard is.

`getAllRepos()` catches errors from each agent's `loadRepos()` individually and attaches them to the returned `Repo` objects as `errors: RepoError[]` (where `RepoError` carries the agent `brand` and error `message`). Because an agent-level failure affects all configured repos, the error is attached to every repo entry. Repo paths that had no successful data from any agent still get stub entries so the error is visible.

The same pattern applies to `getAgentSession()` — each agent is tried in turn, failures are isolated, and the next agent gets a chance.

Filesystem operations in the Claude agent that handle expected "not found" conditions (e.g. `~/.claude/projects/` doesn't exist) remain caught, since a missing directory is not an error — it means the user hasn't used Claude Code.

### Client side

Query error states (`.error` on remote function results) display the actual error message, not a generic placeholder like "Failed to load repositories." Error text is rendered using the ErrorSpan component; if additional error chrome is needed, it should be use `--ctp-maroon` for consistency.

When errors are carried as data on otherwise-successful responses (e.g. `Repo.errors`), the client renders them inline. `RepoCard` displays each error as `[brand] message` inside an `<ErrorSpan>`, so the user sees which agent failed and why directly on the repo card.

`<svelte:boundary>` elements wrap the main rendering sections (repo columns, agent detail log, repo detail content) to catch unexpected runtime errors during rendering. These show the error message in the same style.

## Consequences

- Errors from agent backends are visible directly in the dashboard UI, on the repo cards they affect.
- A single agent's failure degrades gracefully — other agents' sessions still appear, and the error is shown alongside them.
- Developers can diagnose connection issues, SDK misconfigurations, and API errors without checking the server terminal.
- The UI may occasionally show error text where it previously showed nothing. This is intentional — nothing was the wrong answer.
