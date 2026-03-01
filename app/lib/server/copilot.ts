import {
	CopilotClient,
	approveAll,
	type SessionMetadata,
	type SessionEvent
} from '@github/copilot-sdk';
import type { Agent } from './agent';
import type { AgentBrand } from '../brands';
import type {
	AgentDetail,
	AgentRepoSummary,
	AgentRepoSessionSummary,
	LogEntry,
	SessionMode
} from '../messages';
import { buildLastEntries } from './last-entries';
import { getAgentProcesses, getWorkspacesWithAgent, markExternalSessions } from './processes';

/**
 * Client lifecycle management.
 *
 * The Copilot SDK manages its own CLI process via `autoStart: true`,
 * so we don't need manual spawn + stdout URL parsing. A single global
 * CopilotClient replaces opencode's per-directory client map — Copilot
 * sessions carry `context.cwd` metadata for repo filtering.
 */
let clientInstance: CopilotClient | null = null;

/** Session ID → repo path, populated during loadRepos for fast lookups in loadSession. */
const sessionRepoCache = new Map<string, string>();

async function ensureClient(): Promise<CopilotClient> {
	if (!clientInstance) {
		clientInstance = new CopilotClient({ autoStart: true, useStdio: true });
		await clientInstance.start();
	}
	return clientInstance;
}

/** Shut down the Copilot client and clear all cached state. */
export async function closeCopilotClient(): Promise<void> {
	if (clientInstance) {
		await clientInstance.stop();
		clientInstance = null;
	}
	sessionRepoCache.clear();
}

function mapCopilotMode(mode: string | null): SessionMode | null {
	switch (mode) {
		case 'interactive':
			return 'standard';
		case 'plan':
			return 'plan';
		case 'autopilot':
			return 'yolo';
		default:
			return null;
	}
}

function toArgs(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

export default class CopilotAgent implements Agent {
	brand: AgentBrand = 'gc';

	async loadRepos(repoPaths: string[], maxSessions: number): Promise<AgentRepoSummary[]> {
		const client = await ensureClient();
		const allSessions = await client.listSessions();

		const repos = await Promise.all(
			repoPaths.map((repoPath) =>
				this.loadRepo(client, allSessions, repoPath, maxSessions)
			)
		);

		const processes = await getAgentProcesses();
		const activeWorkspaces = getWorkspacesWithAgent(processes, 'copilot');
		markExternalSessions(repos.flatMap((r) => r.sessions), activeWorkspaces);

		return repos;
	}

	private async loadRepo(
		client: CopilotClient,
		allSessions: SessionMetadata[],
		repoPath: string,
		maxSessions: number
	): Promise<AgentRepoSummary> {
		const repoSessions = allSessions.filter((s) => {
			const ctx = s.context;
			if (!ctx) return false;
			return (
				ctx.cwd.toLowerCase() === repoPath.toLowerCase() ||
				ctx.gitRoot?.toLowerCase() === repoPath.toLowerCase()
			);
		});

		repoSessions.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());
		const recentSessions = repoSessions.slice(0, maxSessions);

		const sessions = await Promise.all(
			recentSessions.map((metadata) =>
				this.mapSession(client, metadata, repoPath)
			)
		);

		const branch = recentSessions[0]?.context?.branch ?? 'HEAD';

		return {
			path: repoPath,
			branch: branch || 'HEAD',
			sessions
		};
	}

	private async mapSession(
		client: CopilotClient,
		metadata: SessionMetadata,
		repoPath: string
	): Promise<AgentRepoSessionSummary> {
		sessionRepoCache.set(metadata.sessionId, repoPath);

		const session = await client.resumeSession(metadata.sessionId, {
			onPermissionRequest: approveAll,
			disableResume: true
		});
		let events: SessionEvent[];
		try {
			events = await session.getMessages();
		} finally {
			await session.destroy();
		}

		let mode: SessionMode | null = null;
		let seq = 0;
		let lastAssistant: { text: string; timestamp: string; seq: number } | null = null;
		let lastToolUse: {
			id: string;
			tool: string;
			args: Record<string, unknown>;
			timestamp: string;
			seq: number;
		} | null = null;
		const toolResults = new Map<string, boolean>();

		// Map toolCallId → our internal id for matching starts with completions
		const toolCallIdMap = new Map<string, string>();

		for (const event of events) {
			const timestamp = event.timestamp;

			switch (event.type) {
				case 'session.mode_changed':
					mode = mapCopilotMode(event.data.newMode) ?? mode;
					break;

				case 'assistant.message': {
					const text = event.data.content;
					if (text) {
						lastAssistant = { text, timestamp, seq: seq++ };
					}
					break;
				}

				case 'tool.execution_start': {
					const toolId = `${metadata.sessionId}-${event.data.toolName}-${seq}`;
					toolCallIdMap.set(event.data.toolCallId, toolId);
					lastToolUse = {
						id: toolId,
						tool: event.data.toolName,
						args: toArgs(event.data.arguments),
						timestamp,
						seq: seq++
					};
					break;
				}

				case 'tool.execution_complete': {
					const toolId = toolCallIdMap.get(event.data.toolCallId);
					if (toolId) {
						toolResults.set(toolId, event.data.success);
					}
					break;
				}
			}
		}

		const title = metadata.summary
			?? this.firstUserMessage(events)
			?? metadata.sessionId;

		return {
			id: metadata.sessionId,
			workspace: repoPath,
			title,
			status: 'inactive',
			mode,
			timestamp: metadata.modifiedTime.getTime(),
			lastEntries: buildLastEntries(lastAssistant, lastToolUse, toolResults)
		};
	}

	private firstUserMessage(events: SessionEvent[]): string | null {
		for (const event of events) {
			if (event.type === 'user.message' && event.data.content) {
				const text = event.data.content;
				const nl = text.indexOf('\n');
				return nl === -1 ? text : text.slice(0, nl);
			}
		}
		return null;
	}

	async loadSession(id: string): Promise<Omit<AgentDetail, 'brand'> | null> {
		const client = await ensureClient();

		const session = await client.resumeSession(id, {
			onPermissionRequest: approveAll,
			disableResume: true
		});
		let events: SessionEvent[];
		try {
			events = await session.getMessages();
		} catch {
			return null;
		} finally {
			await session.destroy();
		}

		const log = this.mapEventsToLog(events);

		const title = this.firstUserMessage(events) ?? id;

		return { id, title, log };
	}

	private mapEventsToLog(events: SessionEvent[]): LogEntry[] {
		const log: LogEntry[] = [];
		const pendingTools = new Map<
			string,
			{ tool: string; args: Record<string, unknown>; timestamp: string }
		>();

		for (const event of events) {
			const timestamp = event.timestamp;

			switch (event.type) {
				case 'user.message': {
					const text = event.data.content;
					if (text) {
						log.push({ type: 'user', text, timestamp });
					}
					break;
				}

				case 'assistant.message': {
					const text = event.data.content;
					if (text) {
						log.push({ type: 'assistant', text, timestamp });
					}
					break;
				}

				case 'tool.execution_start': {
					pendingTools.set(event.data.toolCallId, {
						tool: event.data.toolName,
						args: toArgs(event.data.arguments),
						timestamp
					});
					break;
				}

				case 'tool.execution_complete': {
					const pending = pendingTools.get(event.data.toolCallId);
					if (pending) {
						log.push({
							type: 'tool_use',
							tool: pending.tool,
							args: new Map(Object.entries(pending.args)),
							success: event.data.success,
							timestamp: pending.timestamp
						});
						pendingTools.delete(event.data.toolCallId);
					} else {
						log.push({
							type: 'tool_use',
							tool: 'unknown',
							args: new Map(),
							success: event.data.success,
							timestamp
						});
					}
					break;
				}
			}
		}

		// Emit any tool starts that never completed
		for (const [, pending] of pendingTools) {
			log.push({
				type: 'tool_use',
				tool: pending.tool,
				args: new Map(Object.entries(pending.args)),
				success: true,
				timestamp: pending.timestamp
			});
		}

		return log;
	}
}
