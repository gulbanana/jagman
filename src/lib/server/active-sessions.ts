import type { SessionStatus } from '../messages';

/**
 * In-memory ordered list of active session IDs, maintained across
 * getAllRepos() calls within a single JAGMAN process lifetime.
 *
 * When a session first becomes active (status is "running" or "waiting"),
 * it is prepended to the list. Sessions that are no longer active are
 * removed. Existing active sessions maintain their position — they do
 * not move around when the list is refreshed.
 */
let activeOrder: string[] = [];

/**
 * Refresh the active-order list against the current set of sessions.
 *
 * - Sessions whose status is "running" or "waiting" are considered active.
 * - Newly active sessions are prepended (added to the *start*).
 * - Sessions that dropped to inactive are removed.
 * - Sessions that were already tracked keep their existing position.
 *
 * Returns the current ordered list of active session IDs.
 */
export function updateActiveOrder(
	sessions: { id: string; status: SessionStatus }[]
): string[] {
	const currentlyActive = new Set(
		sessions
			.filter((s) => s.status === 'running' || s.status === 'waiting')
			.map((s) => s.id)
	);

	// Remove sessions that are no longer active
	activeOrder = activeOrder.filter((id) => currentlyActive.has(id));

	// Prepend newly active sessions (not already tracked)
	const existing = new Set(activeOrder);
	const newlyActive = [...currentlyActive].filter((id) => !existing.has(id));
	activeOrder = [...newlyActive, ...activeOrder];

	return activeOrder;
}
