# OpenCode Sessions Implementation Plan

## Overview

Replace the stub OpenCode agent implementation with a real one that uses the `@opencode-ai/sdk` to connect to OpenCode servers and fetch session data.

## Key Architectural Difference

ClaudeAgent reads session data from `.jsonl` files on the filesystem. OpenCodeAgent will connect to running OpenCode servers via HTTP using the `@opencode-ai/sdk` package. JAGMAN manages the server lifecycle — starting one OpenCode server per project directory and stopping them on shutdown.

## Steps

### 1. New file: `src/lib/server/config.ts`

Extract the hardcoded repo paths from `claude.ts` into a shared config module:

```typescript
export const REPO_PATHS = [
    'C:\\Users\\banana\\Documents\\code\\jagman',
    'C:\\Users\\banana\\Documents\\code\\gg',
    'C:\\Users\\banana\\Documents\\code\\lockhaven'
];
```

### 2. Modify Agent interface in `agent.ts`

Change `loadRepos()` to receive repo paths as a parameter:

```typescript
export interface Agent {
    brand: AgentBrand;
    loadRepos(repoPaths: string[]): Promise<AgentRepo[]>;
    loadSession(id: string): Promise<Omit<AgentSession, 'brand'> | null>;
}
```

Update `getAllRepos()` to import from config and pass paths to each agent.

### 3. Update ClaudeAgent in `claude.ts`

Remove the `REPO_PATHS` constant and accept it as a parameter to `loadRepos()`.

### 4. Install SDK

```
npm install @opencode-ai/sdk
```

### 5. Rewrite `src/lib/server/opencode.ts`

**Server lifecycle management:**
- Maintain a `Map<string, { client, server }>` keyed by repo path
- On `loadRepos()`, for each repo path, start an OpenCode server via `createOpencode()` if not already running
- Pass the `directory` query parameter on API calls to scope to each project
- Store server handles for cleanup on shutdown

**`loadRepos(repoPaths)`:**
1. For each repo path, ensure a server is running and get its client
2. Call `client.session.list()` for all sessions
3. Get session statuses via `/session/status` endpoint
4. Get VCS info for the branch
5. For each session, fetch messages to extract the `mode` from `AssistantMessage.mode`
6. Map to `AgentRepoSession[]`:
   - Status: `busy` → `running`, `retry` → `waiting`, `idle` → `completed`
   - Mode: map from OpenCode agent name (`"plan"` → `"plan"`, else → `"standard"`)
   - Slug: `session.title`
   - Timestamp: `new Date(session.time.created * 1000).toISOString()`

**`loadSession(id)`:**
1. Find which client owns the session (try each)
2. Get session info for the title/slug
3. Get messages via `client.session.messages({ path: { id } })`
4. Map `{ info: Message, parts: Part[] }[]` to `LogEntry[]`:
   - `UserMessage` + `TextPart[]` → `UserEntry` (concatenate text parts)
   - `AssistantMessage` + `TextPart[]` → `AssistantEntry`
   - `ToolPart` → `ToolUseEntry` with `success: state.status === 'completed'`

**Error handling:**
- Wrap all API calls in try/catch; return `[]` / `null` on failure
- Log errors but don't crash

### 6. Verify

Run `npm run check` to ensure no type errors.

## Design Notes

- **Single server = single project.** The OpenCode server runs per-project. JAGMAN starts one per configured repo path.
- **Session mode from messages.** The `Session` type doesn't carry mode info. We fetch messages for each session to extract `AssistantMessage.mode`. This is expensive but correct; caching will be added later.
- **Session status via `/session/status`.** Returns `{ [sessionID]: SessionStatus }` with `idle`/`busy`/`retry` states.
