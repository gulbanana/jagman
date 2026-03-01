import { subscribeActivity } from "$lib/server/state";

export function GET(): Response {
	let unsubscribe: (() => void) | null = null;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			controller.enqueue(encoder.encode(": connected\n\n"));

			unsubscribe = subscribeActivity(() => {
				try {
					controller.enqueue(
						encoder.encode("event: activity\ndata: updated\n\n"),
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
