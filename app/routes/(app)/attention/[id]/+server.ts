import { error } from "@sveltejs/kit";
import { resolveAttention } from "$lib/server/state";

export function DELETE({ params }: { params: { id: string } }): Response {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		error(400, "Invalid ID");
	}

	const resolved = resolveAttention(id);
	if (!resolved) {
		error(404, "Attention item not found");
	}

	return new Response(null, { status: 200 });
}
