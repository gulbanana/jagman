import type { AttentionDetail } from '$lib/messages';

export const mockAttentionCards: AttentionDetail[] = [
	{ type: "permission-command" },
	{ type: "permission-edit" },
	{ type: "idle-prompt", agent: { brand: "cc", id: "mock-idle", workspace: "default", title: "Idle agent", status: "waiting", mode: null, timestamp: Date.now(), lastEntries: [] } },
	{ type: "review" },
];
