import type { AttentionDetail } from "$lib/messages";

export function attentionMeta(detail: AttentionDetail): { kind: string; title: string; description: string } {
	switch (detail.type) {
		case "launch-prompt":
			return { kind: "Prompt", title: "New agent", description: detail.displayPath };
		case "idle-prompt":
			return { kind: "Prompt", title: detail.agent.title, description: detail.displayPath };
	}
}
