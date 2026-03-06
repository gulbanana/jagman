import { error, json } from "@sveltejs/kit";
import { getAttention, resolveAttention } from "$lib/server/state";
import { removeAgentWorkspace } from "$lib/server/gg";

export async function POST({ params }: { params: { id: string } }): Promise<Response> {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		error(400, "Invalid ID");
	}

	const item = getAttention().find((a) => a.id === id);
	if (!item) {
		error(404, "Attention item not found");
	}
	if (item.detail.type !== "idle-prompt") {
		error(400, "Attention item is not an idle prompt");
	}

	const { agent, displayPath } = item.detail;

	try {
		await removeAgentWorkspace(displayPath, agent.workspace);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		error(500, `Failed to remove workspace: ${message}`);
	}

	resolveAttention(id);

	return json({ ok: true });
}
