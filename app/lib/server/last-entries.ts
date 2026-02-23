import type { LogEntry } from '../messages';

/**
 * Build the `lastEntries` array for an agent card preview.
 *
 * Algorithm:
 * 1. The first entry is the last assistant message (if any).
 * 2. If the last tool_use is later than the last assistant message,
 *    the second entry is that tool_use. Otherwise there is no second entry.
 */
export function buildLastEntries(
	lastAssistant: { text: string; timestamp: string; seq: number } | null,
	lastToolUse: { id: string; tool: string; args: Record<string, unknown>; timestamp: string; seq: number } | null,
	toolResults: Map<string, boolean>
): LogEntry[] {
	const entries: LogEntry[] = [];

	if (lastAssistant) {
		entries.push({ type: 'assistant', text: lastAssistant.text, timestamp: lastAssistant.timestamp });
	}

	if (lastToolUse && lastToolUse.seq > (lastAssistant?.seq ?? -1)) {
		entries.push({
			type: 'tool_use',
			tool: lastToolUse.tool,
			args: new Map(Object.entries(lastToolUse.args)),
			success: toolResults.get(lastToolUse.id) ?? true,
			timestamp: lastToolUse.timestamp
		});
	}

	return entries;
}
