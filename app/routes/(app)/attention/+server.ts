import { json } from "@sveltejs/kit";
import type { AttentionDetail } from "$lib/messages";
import { pushAttention, subscribeAttention } from "$lib/server/state";

export function GET(): Response {
	let unsubscribe: (() => void) | null = null;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			controller.enqueue(encoder.encode(": connected\n\n"));

			unsubscribe = subscribeAttention(() => {
				try {
					controller.enqueue(
						encoder.encode("event: attention\ndata: updated\n\n"),
					);
				} catch {
					unsubscribe?.();
					unsubscribe = null;
				}
			});
		},
		cancel() {
			unsubscribe?.();
			unsubscribe = null;
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

export async function POST({ request }: { request: Request }): Promise<Response> {
	const detail: AttentionDetail = await request.json();
	const item = pushAttention(detail);
	return json({ id: item.id });
}
