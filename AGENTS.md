# JAGMAN - Jujutsu AGent MANager

JAGMAN is a locally-hosted web application for managing multiple LLM coding agents working across multiple repositories. It uses the SDKs of supported agents to launch, control, and interact with them, while using Jujutsu workspaces to isolate each agent's work.

JAGMAN is a work in progress and most of the planned features have't been built yet.

## Overview

### What JAGMAN Does

JAGMAN lets a developer run multiple AI coding agents in parallel across their projects. Rather than juggling terminal windows, the user gets a single dashboard where agents surface their needs (permission requests, prompts, code review) and the user responds.

### Supported Agents

JAGMAN uses an abstraction layer over agent SDKs. The initial targets are:

- **Claude Code** — via the Claude Agent SDK (TypeScript)
- **Opencode** — via the Opencode SDK (TypeScript)
- **GitHub Copilot** — under consideration as a future target

Both Claude Code and Opencode have similar capabilities (autonomous coding, tool use, permission gating), making a shared abstraction practical.

### Jujutsu Integration

Each agent runs in its own **Jujutsu workspace** — a separate directory with its own working-copy commit, sharing history with the main repo. This means:

- The user's main workspace is never touched by agents
- Multiple agents can work on the same repo simultaneously without conflicts
- Agent work is tracked as ordinary jj commits, visible in the repo's history
- No branch management is needed — jj's branchless workflow handles isolation naturally

JAGMAN embeds [**GG**](https://github.com/gulbanana/gg) as a native library for Jujutsu operations. GG is a sister project (source at `../gg`) that provides both a desktop GUI and a web server for JJ repositories. JAGMAN uses GG's worker, config, and message types via a Rust NAPI-RS addon. The dashboard's detail pane will also display some of GG's views in iframes.

### Persistence

Session history, agent configuration, and other state are stored in a local **SQLite** database.

## Architecture

### Tech Stack

- **SvelteKit** (Svelte 5) — serves both the UI and the server-side API in a single process
- **TypeScript** throughout
- **Rust** via NAPI-RS — native addon embedding GG for Jujutsu operations
- **SQLite** via Drizzle ORM + better-sqlite3 for persistence
- **Agent SDKs** (Claude Agent SDK, Opencode SDK) for agent control

### UI Structure

The main dashboard is a two-row grid flanked by sidebars. The top row is the attention bar; the bottom row is split into a horizontally-scrolling repo area and a detail pane.

#### Attention Bar

A horizontal strip across the top containing **attention cards** — things that need user action:

- **Permission requests** — an agent needs approval to run a command, edit a file, etc.
- **Prompt entry** — the user is composing instructions for a new or existing agent
- **Code review** — an agent has produced changes for the user to review

#### Repo Area

A horizontally-scrolling row of **repo columns** (using lookless scrolling), one per repository. Each column is a vertical stack (also lookless-scrolling) containing:

1. A **repo header pane** — the repository path, branch name, and agent count. The repo name is coloured peach when any agents are active. Clickable to show repo details in the detail pane.
2. **Agent cards** — buttons wrapping headerless panes, one per agent session (both active and historical). Each shows information about a running agent or past session.

Agent cards have a coloured border indicating their mode:

- `--ctp-peach` — standard mode
- `--ctp-blue` — plan mode
- `--ctp-red` — yolo mode (all permissions bypassed)
- No special colour — completed/inactive sessions

Agent status is conveyed by border animation: running agents have an animated rotating spark effect on their mode-coloured border; inactive agents have a static border.

Clicking an agent card shows its details in the detail pane.

#### Detail Pane

The right-hand panel, sized via `auto minmax(512px, 1fr)` — the repo columns take their natural width and the detail pane fills the remaining space (minimum 512px). Shows one of:

- **Empty placeholder** (default) — prompts the user to open a repository
- **Agent detail** — the selected agent's streaming log or session history
- **Repo detail** — the selected repo's branch info and recent jj change log

Has a header showing the current selection (icon and label).

#### Layout Grid

```
┌─────────────────────────────────────────────────┐
│  Attention bar  [ card ] [ card ] [ card ...►   │
├──────────────────────────────┬──────────────────┤
│  Repo columns (h-scroll)     │  Detail pane     │
│  [repo1] [repo2] [repo3...►  │  (empty,          │
│                              │   agent, or repo) │
└──────────────────────────────┴──────────────────┘
```

#### Launch Flow

To start a new agent session, the user clicks in the agent list (on a repo or a "new agent" control), which opens an attention card where they can enter a prompt and configure the session before launching.

### Component Architecture

- **`Pane`** — the core presentational component. A bordered box with an optional header and content area. Supports `stackedAbove`/`stackedBelow` flags to remove rounded corners for vertical stacking, and a `mode` prop (`SessionMode | null`) that derives border colour from the agent's mode (peach for standard, blue for plan, red for yolo). When `animated` is set and a mode is active, a rotating conic-gradient border effect (spark) is applied.
- **`AttentionBar`** / **`AttentionCard`** — the top-level attention strip and its items.
- **`RepoColumn`** — a vertical scrolling container using the lookless scrolling pattern.
- **`AgentCard`** — a button wrapping a headerless Pane with mode-coloured border.
- **Detail pane** — the right-hand panel contains a `Pane` with a client-side header and an iframe. The iframe loads routes under `/detail/` (agent output, repo views via GG). Detail routes use the root layout (theme only, no sidebars) and render with a `--ctp-crust` background to match the Pane content area.

### Native Addon (`libgg`)

JAGMAN includes a Rust NAPI-RS crate (`src/lib.rs`) that embeds GG as a native Node.js addon, giving server-side TypeScript direct access to Jujutsu operations. The native module can only be imported in server-side code (`app/lib/server/`). See [src/AGENTS.md](src/AGENTS.md) for build process, GG dependency details, and bundler externalisation.

### Database (`app/lib/server/db/`)

JAGMAN uses **Drizzle ORM** with **better-sqlite3** for local persistence. The schema is defined in TypeScript (`app/lib/server/db/schema.ts`) and the database client is exported from `app/lib/server/db/index.ts`. Like `libgg`, the `better-sqlite3` native addon is externalized from Vite's SSR bundle (configured in `vite.config.ts`).

**Schema management** uses Drizzle Kit:

- `npm run db:push` — push schema changes directly to the database (development)
- `npm run db:generate` — generate SQL migration files from schema diffs
- `npm run db:migrate` — apply pending migrations
- `npm run db:studio` — open Drizzle Studio for browsing data

Configuration is in `drizzle.config.ts`. The database URL defaults to `local.db` (set via `DATABASE_URL` in `.env`).

## Design System

### Colors

All colors must come from the Catppuccin palette via `--ctp-*` CSS variables defined in `app/lib/theme.css`. Never use raw hex, rgb, or named colors for visible UI elements. (`transparent`, `black`/`transparent` in CSS masks, and `currentColor` are permitted where semantically appropriate.)

### Metrics

All spatial lengths — padding, margin, gap, border-radius, explicit width/height, min-width/min-height — must be **powers of two**: 1, 2, 4, 8, 16, 32, 64, 128, 256px.

This does not apply to font-size, letter-spacing, line-height, or values derived from font metrics (e.g. Logo grid rows matching its font-size).

### Font Stacks

Font stacks are defined as CSS custom properties (`--ff-*`) in `theme.css`. Typography is still being refined, but the general approach is to provide purpose-specific stacks (e.g. body text, condensed headings, monospace) that components reference by variable rather than by literal font names.

### Lookless Scrolling

Scrollable regions use a consistent "lookless" pattern: the native scrollbar is hidden, and a CSS `mask-image` gradient fades content to transparent at the scroll edge to hint that more content exists. The fade region is 64px. The fade only appears when the element actually overflows, controlled by the `overflowing` Svelte action (`app/lib/overflowing.ts`) which sets a `data-overflowing` attribute via `ResizeObserver`.

```css
scrollbar-width: none;              /* Firefox */
&::-webkit-scrollbar { display: none; }  /* Chrome/Safari */

&:global([data-overflowing]) {    /* :global() needed — attribute is set by JS action, not template */
    mask-image: linear-gradient(
        to <direction>,              /* right for horizontal, bottom for vertical */
        black calc(100% - 64px),
        transparent
    );
}
```

```svelte
<script>
    import { overflowing } from "$lib/overflowing";
</script>
<div use:overflowing> ... </div>
```

Used by:
- **AttentionBar** — horizontal scroll, fades right
- **Repo row** (`.repos` in `+page.svelte`) — horizontal scroll, fades right
- **RepoColumn** — vertical scroll, fades bottom

### Empty States

When a region has no content to display, show centered placeholder text using the UI font in the `--ctp-subtext0` colour:

```css
.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--ff-ui);
    color: var(--ctp-subtext0);
}
```

Used by:
- **Detail pane placeholder** (`detail/empty`) — "Open a repository to get started."
- **AgentCard** — "Awaiting prompt." when no log entries exist
- **Status messages** (`.status-message` in `+page.svelte`) — loading and error states

## Code Style

### Null Over Undefined

Use `null` as the explicit marker for "no value" in object properties. Do not use optional properties (`?:`) or `undefined` for this purpose — `undefined` can appear accidentally (e.g. missing keys, failed lookups) and has overloaded semantics in function signatures. Prefer `T | null` with a default of `null`.

This applies to:
- **Data model types** — fields on domain objects, messages, API responses
- **Computed values** — derived state or ternary expressions that may produce "no value"
- **Props that carry domain data** — e.g. a `mode` prop derived from a nullable model field

Standard Svelte optional props (`header?: Snippet`, `stackedAbove?: boolean`) that simply allow callers to omit a prop are fine as `?:`.

## Development Tools

### Svelte MCP Server

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

#### list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### Type Checking

Run `npm run check` to check for TypeScript errors. This runs `svelte-kit sync` followed by `svelte-check`.
