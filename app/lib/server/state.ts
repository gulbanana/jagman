import type { ActivityEntry } from "../activity";

// Preserve in-memory state across Vite HMR reloads by stashing it on globalThis.
// Without this, every server-side module re-evaluation resets arrays/sets to empty,
// orphaning running processes and losing activity history.

type Listener = () => void;
type CleanupFn = () => void | Promise<void>;

type HmrState = {
	entries: ActivityEntry[];
	listeners: Set<Listener>;
	cleanupHooks: Map<string, CleanupFn>;
	lateCleanupHooks: Map<string, CleanupFn>;
	services: Map<string, object>;
	shuttingDown: boolean;
	started: boolean;
};

const KEY = Symbol.for("__jagman_state__");
const g = globalThis as unknown as Record<symbol, HmrState>;
const state: HmrState = (g[KEY] ??= {
	entries: [],
	listeners: new Set(),
	cleanupHooks: new Map(),
	lateCleanupHooks: new Map(),
	services: new Map(),
	shuttingDown: false,
	started: false,
});

export function pushActivity(entry: Omit<ActivityEntry, "timestamp">): void {
	state.entries.push({ ...entry, timestamp: Date.now() });
	for (const listener of state.listeners) {
		listener();
	}
}

export function getActivity(): ActivityEntry[] {
	return state.entries.slice().reverse();
}

export function subscribeActivity(listener: Listener): () => void {
	state.listeners.add(listener);
	return () => {
		state.listeners.delete(listener);
	};
}

// --- Lifecycle management ---

/** Register a cleanup function to run on shutdown. Idempotent by name — re-registering replaces the previous hook.
 *  `{ late: true }` defers it to after all normal hooks. */
export function onShutdown(name: string, fn: CleanupFn, options?: { late: boolean }): void {
	const map = options?.late ? state.lateCleanupHooks : state.cleanupHooks;
	map.set(name, fn);
}

/**
 * Initialise a named service, returning its HMR-stable state object.
 *
 * On first call (cold start): runs `init()`, stores the result, registers a
 * shutdown hook that calls `cleanup(state)`, and returns the state.
 *
 * On subsequent calls (Vite HMR reload): returns the existing state without
 * re-running init or re-registering the hook.
 */
export function initService<T extends object>(
	name: string,
	init: () => T,
	cleanup: (state: T) => void | Promise<void>,
	options?: { late: boolean },
): T {
	const existing = state.services.get(name);
	if (existing) {
		return existing as T;
	}
	const svc = init();
	state.services.set(name, svc);
	onShutdown(name, () => cleanup(svc), options);
	pushActivity({ source: "jg", event: name, detail: "service started" });
	return svc;
}

/** Run all cleanup hooks and exit. Re-entrant calls force-exit immediately. */
export async function shutdown(): Promise<never> {
	if (state.shuttingDown) {
		process.exit(1);
	}
	state.shuttingDown = true;

	for (const hooks of [state.cleanupHooks, state.lateCleanupHooks]) {
		const entries = [...hooks.entries()];
		const results = await Promise.allSettled(entries.map(([, fn]) => fn()));
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === 'rejected') {
				console.error(`Shutdown hook '${entries[i][0]}' failed:`, result.reason);
			}
		}
	}

	process.exit(0);
}

initService("JAGMAN", () => ({}), _ => { });
