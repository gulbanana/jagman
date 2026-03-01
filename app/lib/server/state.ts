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
