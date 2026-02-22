# ADR 0001: Remote functions for client-server data flow

## Status

Accepted

## Context

JAGMAN needs a pattern for moving data between the server (where the database and agent SDKs live) and the client (the SvelteKit UI). The initial prototype hardcoded all repo and agent data in the page component. We needed to establish the data flow pattern before building real persistence and agent integration.

Key requirements:

- **Type safety** across the client-server boundary — the UI and server should share domain types without manual serialization.
- **SSR on first render** — repo/agent data should be in the initial HTML, not fetched after hydration.
- **Reactive updates after mutations** — when the user performs an action (launching an agent, approving a permission), the UI should reflect the new state without a full page reload.
- **Low ceremony** — JAGMAN is a local single-user tool, not a public web service. The data layer shouldn't require more infrastructure than necessary. JavaScript is always available — progressive enhancement is not a goal.

## Alternatives considered

### SvelteKit load functions (+page.server.ts)

The traditional SvelteKit approach. Load functions run on the server and pass data to the page as props. Mutations use form actions.

This works but creates a separation between data fetching (in `+page.server.ts`) and data consumption (in `+page.svelte`) that adds indirection. Form actions require a specific file structure and don't compose as naturally when multiple independent data sources are on one page.

### Custom API endpoints + client-side fetch

Define REST-style endpoints in `app/routes/api/`, call them from the client with `fetch`. Maximum flexibility but no type safety across the boundary, no automatic SSR, and significant boilerplate for serialization, error handling, and cache management.

### Remote functions (query / form / command)

SvelteKit's experimental remote functions feature. Functions are defined in `.remote.ts` files and imported directly into components. They run on the server but are called like normal functions on the client. SvelteKit generates the HTTP endpoints and handles serialization via devalue.

## Decision

Use SvelteKit remote functions as the primary data flow mechanism.

- **Reads** use `query()` — returns a reactive object with `.current`, `.loading`, `.error`, and `.refresh()`. SSR'd on first render, re-fetchable on demand.
- **Form-based mutations** use `form()` — spreads onto a `<form>` element, automatically refreshes all active queries on success.
- **Imperative mutations** use `command()` — for actions triggered outside a form context, with explicit `.updates()` to refresh specific queries.
- **Shared types** live in `app/lib/messages.ts` and are imported by both remote modules and components.

Remote function files are colocated with the routes that use them (e.g. `app/routes/data.remote.ts` alongside `app/routes/+page.svelte`).

## Consequences

- The feature is experimental (since SvelteKit 2.27) and may change. We accept this risk given that JAGMAN is not a production service and the migration path from remote functions to load functions or API endpoints is straightforward.
- `kit.experimental.remoteFunctions` must be enabled in `svelte.config.js`.
- We do **not** enable `compilerOptions.experimental.async` (the `await`-in-templates feature). Instead we use the `.loading` / `.error` / `.current` pattern, avoiding a second experimental flag and keeping loading states explicit in the template.
- Polling or SSE can trigger `.refresh()` later for real-time updates without changing the data access pattern. The acting user's own mutations are already handled by `form`/`command` auto-refresh.
- All server-only code (database access, agent SDK calls) stays inside `.remote.ts` files or modules they import, keeping the client bundle clean.
