import type { ActivityEntry } from "../activity";

const entries: ActivityEntry[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

export function pushActivity(entry: ActivityEntry): void {
	entries.push(entry);
	for (const listener of listeners) {
		listener();
	}
}

export function getActivity(): ActivityEntry[] {
	return entries.slice().reverse();
}

export function subscribeActivity(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

// --- Lifecycle management ---

type CleanupFn = () => void | Promise<void>;
type CleanupEntry = { name: string; fn: CleanupFn };

const cleanupHooks: CleanupEntry[] = [];
const lateCleanupHooks: CleanupEntry[] = [];
let shuttingDown = false;

/** Register a cleanup function to run on shutdown. `{ late: true }` defers it to after all normal hooks. */
export function onShutdown(name: string, fn: CleanupFn, options?: { late: boolean }): void {
	const list = options?.late ? lateCleanupHooks : cleanupHooks;
	list.push({ name, fn });
}

/** Run all cleanup hooks and exit. Re-entrant calls force-exit immediately. */
export async function shutdown(): Promise<never> {
	if (shuttingDown) {
		process.exit(1);
	}
	shuttingDown = true;

	for (const phase of [cleanupHooks, lateCleanupHooks]) {
		const results = await Promise.allSettled(phase.map((h) => h.fn()));
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === 'rejected') {
				console.error(`Shutdown hook '${phase[i].name}' failed:`, result.reason);
			}
		}
	}

	process.exit(0);
}

// --- Startup test events ---
pushActivity({
	source: "jg",
	event: "startup",
	detail: "JAGMAN started",
	timestamp: Date.now(),
});

setTimeout(() => {
	pushActivity({
		source: "jg",
		event: "ready",
		detail: "All agents initialized",
		timestamp: Date.now(),
	});
}, 10_000);
