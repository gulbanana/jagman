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

The UI has two main areas:

#### Agent Area

A horizontal layout of columns, one per repository. Each column shows repository information in a header and compact status cards for agents working on that repo (both active and past sessions). This is the overview — it tells the user at a glance what's running and where.

Clicking an agent in the list opens a corresponding item in the attention area (to launch a new agent, view a running agent's request, etc.).

#### Attention Area

The primary interaction surface. This is a horizontal accordion of **attention cards** — each card represents something that needs or accepts user input:

- **Permission requests** — an agent needs approval to run a command, edit a file, etc.
- **Prompt entry** — the user is composing instructions for a new or existing agent
- **Code review** — an agent has produced changes for the user to review

The focused card expands to fill available space. On wider screens (responsive), multiple cards can display side-by-side.

#### Launch Flow

To start a new agent session, the user clicks in the agent list (on a repo or a "new agent" control), which opens an attention card where they can enter a prompt and configure the session before launching.

#### Future: Drill-Down Views

Not in the MVP, but planned:

- **Streaming output** — open an attention card showing an agent's live output
- **Repository view** — see a repo's jj history, where agents are working, and their commits

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
