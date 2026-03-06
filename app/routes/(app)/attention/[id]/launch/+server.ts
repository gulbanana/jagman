import { error, json } from "@sveltejs/kit";
import type { AgentBrand } from "$lib/brands";
import type { RepoSessionSummary } from "$lib/messages";
import { getAttention, pushAttention, resolveAttention } from "$lib/server/state";
import { createAgentWorkspace } from "$lib/server/gg";

export async function POST({ params }: { params: { id: string } }): Promise<Response> {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		error(400, "Invalid ID");
	}

	const item = getAttention().find((a) => a.id === id);
	if (!item) {
		error(404, "Attention item not found");
	}
	if (item.detail.type !== "launch-prompt") {
		error(400, "Attention item is not a launch prompt");
	}

	const { repoPath, displayPath, brand } = item.detail;

	let workspaceName: string;
	try {
		workspaceName = await createAgentWorkspace(displayPath);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		error(500, `Failed to create workspace: ${message}`);
	}

	const agent: RepoSessionSummary = {
		id: workspaceName,
		workspace: workspaceName,
		title: "New session",
		status: "waiting",
		mode: "standard",
		brand: brand as AgentBrand,
		timestamp: Date.now(),
		lastEntries: [],
	};

	pushAttention({
		type: "idle-prompt",
		agent,
		displayPath,
	});

	resolveAttention(id);

	return json({ ok: true });
}
