import { json, error } from "@sveltejs/kit";
import type { AgentBrand } from "$lib/brands";
import { getRepositoryByPath } from "$lib/server/db/repository";
import { toDisplayPath } from "$lib/server/agent/index";
import { pushAttention } from "$lib/server/state";

export async function POST({ request }: { request: Request }): Promise<Response> {
	const { repoPath } = await request.json() as { repoPath: string };
	const repo = getRepositoryByPath(repoPath);
	if (!repo) {
		error(404, "Repository not found");
	}

	const displayPath = toDisplayPath(repoPath);
	const item = pushAttention({
		type: "launch-prompt",
		repoPath,
		displayPath,
		brand: repo.lastAgentBrand as AgentBrand,
	});
	return json({ id: item.id });
}
