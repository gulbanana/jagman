/**
 * Svelte action that adds `data-overflowing` attribute when the element's
 * scroll size exceeds its client size. Checks both axes.
 *
 * Usage: <div use:overflowing>
 * Then style with: [data-overflowing] { mask-image: ... }
 */
export function overflowing(node: HTMLElement) {
	function update() {
		const h = node.scrollWidth > node.clientWidth;
		const v = node.scrollHeight > node.clientHeight;
		if (h || v) {
			node.setAttribute("data-overflowing", "");
		} else {
			node.removeAttribute("data-overflowing");
		}
	}

	const ro = new ResizeObserver(update);
	ro.observe(node);
	// Also observe children resizing (content changes)
	for (const child of node.children) {
		ro.observe(child);
	}

	// Run on next frame to catch initial layout
	requestAnimationFrame(update);

	return {
		destroy() {
			ro.disconnect();
		}
	};
}
