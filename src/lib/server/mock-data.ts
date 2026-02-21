import type { Commit, AttentionCardData } from '$lib/messages';

export const mockAttentionCards: AttentionCardData[] = [
	{ type: "permission-command" },
	{ type: "permission-edit" },
	{ type: "prompt" },
	{ type: "review" },
];

export const mockCommits: Commit[] = [
	{ hash: "ksqvpn", author: "you", message: "wip: layout prototyping", age: "2m ago" },
	{ hash: "rmzxtl", author: "claude-1", message: "refactor: extract validateCredentials", age: "5m ago" },
	{ hash: "yonwkp", author: "claude-2", message: "feat: search component scaffold", age: "8m ago" },
	{ hash: "vlmqst", author: "claude-3", message: "feat: dark mode support", age: "1h ago" },
	{ hash: "tpxwrn", author: "you", message: "merge: dark mode into main", age: "1h ago" },
	{ hash: "sqkzml", author: "claude-4", message: "fix: login redirect loop", age: "yesterday" },
	{ hash: "nwprtx", author: "opencode-2", message: "chore: update dependencies", age: "yesterday" },
];
