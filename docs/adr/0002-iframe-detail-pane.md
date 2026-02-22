# ADR 0002: Iframe-based detail pane

## Status

Accepted

## Context

The detail pane (right side of the dashboard) needs to display three kinds of content:

- **Agent output** — streaming log from a running agent session, connected to the backend via the agent SDK.
- **Repo log** — a view from [gg](https://github.com/gulbanana/gg) (`gg web`), which runs as a separate local web server and can only be displayed via iframe.
- **(Future) Revision detail** — another gg iframe view for a selected changelist.

Since gg *requires* an iframe, and agent output will need its own server connection (independent of whether the detail pane is open), it makes sense to use iframes uniformly rather than mixing embedded components with iframes depending on the content type.

The question was whether selection changes should involve URL navigation. Options considered:

### Full SvelteKit navigation (route params)

Selection would be encoded in the URL (e.g. `/agent/a1`). The detail content would be part of the main page's route tree.

Pros: server-side data loading via load functions, deep-linkable.
Cons: every selection click triggers route lifecycle; the dashboard layout (attention bar, repo columns) would need to be in a shared layout to avoid re-rendering; deep linking isn't valuable for a local dashboard.

### Shallow routing

Push URL state without triggering navigation. The URL updates for back/forward, but no load functions re-run.

Pros: back/forward works; no route lifecycle overhead.
Cons: data fetching for the detail view must be imperative; doesn't help with the iframe requirement for gg.

### Client-side state controlling an iframe src

Selection stays as a reactive variable in the dashboard component. An iframe in the detail area has its `src` derived from the selection. Each detail view is a separate SvelteKit route under `/detail/...`.

Pros: selection changes are instant (just an iframe src update); detail views are full SvelteKit pages with their own data loading; gg views and JAGMAN views are handled identically; the dashboard never re-renders for selection changes.
Cons: each selection change causes a full page load inside the iframe (mitigated by SSR); no browser back/forward for selections.

## Decision

Use client-side selection state controlling an iframe. Detail views are SvelteKit routes under `/detail/`:

- `/detail/agent/[id]` — agent output (mock log lines now, streaming SDK output later)
- `/detail/repo/[...path]` — repo view (mock commits now, gg iframe later)

The dashboard page derives the iframe `src` from a `Selection` state variable. The iframe is wrapped in a `Pane` component whose header is set client-side from the selection (agent name or repo path), maintaining visual consistency with other panes. The detail pages render only their content — no header or chrome.

### Layout groups

The dashboard has sidebars (provided by the root layout). Detail pages rendered inside an iframe must not get sidebars. SvelteKit's `+layout@.svelte` reset cannot bypass the root layout entirely, so we use layout groups:

- `app/routes/+layout.svelte` — theme and favicon only (shared by all routes)
- `app/routes/(app)/+layout.svelte` — sidebar chrome (dashboard only)
- `app/routes/(app)/+page.svelte` — the dashboard
- `app/routes/detail/...` — detail pages (inherit theme, no sidebars)

### Mock data

Mock data is shared via `$lib/server/mock-data.ts` (server-only module). Both the dashboard's `getRepos` query and the detail routes' queries import from it. In production, these will be independent data sources (repos list from DB, agent detail from SDK, repo detail from gg).

## Consequences

- The `DetailPane.svelte` component is removed. Detail rendering is now in the `/detail/` route pages.
- The dashboard wraps the iframe in a Pane with a client-side header. Detail pages render content only, keeping the header consistent with the rest of the dashboard.
- Selection changes cause a full iframe navigation. This is fast with SSR and is the correct behavior for the future (each view needs its own server connection or gg instance).
- Browser back/forward does not navigate between selections. This is acceptable for a local dashboard.
- Communication between the dashboard and detail views (e.g. "agent requested permission") flows through the backend, not through iframe messaging. The detail pane being open or closed has no effect on event delivery.
