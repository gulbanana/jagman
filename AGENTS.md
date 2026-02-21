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

Both have similar capabilities (autonomous coding, tool use, permission gating), making a shared abstraction practical.

### Jujutsu Integration

Each agent runs in its own **Jujutsu workspace** — a separate directory with its own working-copy commit, sharing history with the main repo. This means:

- The user's main workspace is never touched by agents
- Multiple agents can work on the same repo simultaneously without conflicts
- Agent work is tracked as ordinary jj commits, visible in the repo's history
- No branch management is needed — jj's branchless workflow handles isolation naturally

### Persistence

Session history, agent configuration, and other state are stored in a local **SQLite** database.

## Architecture

### Tech Stack

- **SvelteKit** (Svelte 5) — serves both the UI and the server-side API in a single process
- **TypeScript** throughout
- **SQLite** for persistence
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

1. A **repo header pane** — the repository path, branch name, and agent count. Gets a peach border when any agents are active. Clickable to show repo details in the detail pane.
2. **Agent cards** — buttons wrapping headerless panes, one per agent session (both active and historical). Each shows information about a running agent or past session.

Agent cards have a coloured border indicating their mode:

- `--ctp-peach` — standard mode
- `--ctp-blue` — plan mode
- `--ctp-red` — yolo mode (all permissions bypassed)
- No special colour — completed/inactive sessions

Agent status is shown by a coloured dot:

- `--ctp-green` — running
- `--ctp-yellow` — waiting (for permission, input, etc.)
- `--ctp-overlay1` — completed

Clicking an agent card shows its details in the detail pane.

#### Detail Pane

The right-hand panel, sized at 1fr of a 3fr+1fr grid (25% of available space). Shows one of three views:

- **Activity summary** (default) — a timestamped feed of recent events across all agents
- **Agent detail** — the selected agent's streaming log or session history
- **Repo detail** — the selected repo's branch info and recent jj change log

Has a header showing the current selection and a close button to return to the activity view.

#### Layout Grid

```
┌─────────────────────────────────────────────────┐
│  Attention bar  [ card ] [ card ] [ card ...►   │
├──────────────────────────────┬──────────────────┤
│  Repo columns (h-scroll)     │  Detail pane     │
│  [repo1] [repo2] [repo3...►  │  (activity,      │
│                              │   agent, or repo) │
└──────────────────────────────┴──────────────────┘
```

#### Launch Flow

To start a new agent session, the user clicks in the agent list (on a repo or a "new agent" control), which opens an attention card where they can enter a prompt and configure the session before launching.

### Component Architecture

- **`Pane`** — the core presentational component. A bordered box with an optional header and content area. Supports `stackedAbove`/`stackedBelow` flags to remove rounded corners for vertical stacking, and a `borderColor` prop for mode/status colouring.
- **`AttentionBar`** / **`AttentionCard`** — the top-level attention strip and its items.
- **`RepoColumn`** — a vertical scrolling container using the lookless scrolling pattern.
- **`AgentCard`** — a button wrapping a headerless Pane with mode-coloured border.
- **`DetailPane`** — the right-hand panel, switching between activity, agent, and repo views.

## Design System

### Colors

All colors must come from the Catppuccin palette via `--ctp-*` CSS variables defined in `src/lib/theme.css`. Never use raw hex, rgb, or named colors for visible UI elements. (`transparent`, `black`/`transparent` in CSS masks, and `currentColor` are permitted where semantically appropriate.)

### Metrics

All spatial lengths — padding, margin, gap, border-radius, explicit width/height, min-width/min-height — must be **powers of two**: 1, 2, 4, 8, 16, 32, 64, 128, 256px.

This does not apply to font-size, letter-spacing, line-height, or values derived from font metrics (e.g. Logo grid rows matching its font-size).

### Font Stacks

Font stacks are defined in `theme.css`, including:

- `--stack-ui` — body text, labels
- `--stack-industrial` — condensed headings, section labels, category tags
- `--stack-code` — monospace for code, identifiers, paths, hashes

### Lookless Scrolling

Scrollable regions use a consistent "lookless" pattern: the native scrollbar is hidden, and a CSS `mask-image` gradient fades content to transparent at the scroll edge to hint that more content exists. The fade region is 64px. The fade only appears when the element actually overflows, controlled by the `overflowing` Svelte action (`src/lib/overflowing.ts`) which sets a `data-overflowing` attribute via `ResizeObserver`.

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
