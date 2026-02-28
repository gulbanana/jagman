/**
 * Tracks a set of items in FIFO order and provides a comparator for
 * sorting active-first.  Used for both agent sessions (active sessions
 * before inactive) and repo columns (repos with active sessions before
 * repos without).
 */
export class ActiveOrder {
	private order: string[] = [];

	/**
	 * Refresh the tracked order against the current set of active IDs.
	 *
	 * - IDs that are no longer active are removed.
	 * - Newly active IDs are prepended (added to the *start*).
	 * - IDs that were already tracked keep their existing position.
	 *
	 * Returns a Map from ID to position index, for use with
	 * {@link activeFirstCompare}.
	 */
	update(activeIds: Iterable<string>): Map<string, number> {
		const currentlyActive = new Set(activeIds);

		// Remove items that are no longer active
		this.order = this.order.filter((id) => currentlyActive.has(id));

		// Prepend newly active items (not already tracked)
		const existing = new Set(this.order);
		const newlyActive = [...currentlyActive].filter((id) => !existing.has(id));
		this.order = [...newlyActive, ...this.order];

		return new Map(this.order.map((id, i) => [id, i]));
	}
}

/**
 * Sort comparator: active items first in FIFO order, then inactive items
 * by timestamp descending (newest first).
 */
export function activeFirstCompare(
	activeIndex: Map<string, number>,
	aKey: string,
	aTimestamp: number,
	bKey: string,
	bTimestamp: number,
): number {
	const aActive = activeIndex.has(aKey);
	const bActive = activeIndex.has(bKey);

	if (aActive && !bActive) return -1;
	if (!aActive && bActive) return 1;
	if (aActive && bActive) {
		return activeIndex.get(aKey)! - activeIndex.get(bKey)!;
	}
	return bTimestamp - aTimestamp;
}
