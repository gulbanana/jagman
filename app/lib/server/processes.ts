import { getAgentProcesses as nativeGetAgentProcesses } from 'libgg';
import type { AgentRepoSessionSummary } from '$lib/messages';

export type AgentProcess = {
	name: string;
	pid: number;
	cwd: string;
	commandLine: string;
};

const AGENT_NAMES = ['claude', 'opencode', 'copilot'];

let cache: { timestamp: number; result: AgentProcess[] } | null = null;
const CACHE_TTL = 10_000;

export function getAgentProcesses(): AgentProcess[] {
	if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
		return cache.result;
	}

	let result: AgentProcess[];
	try {
		result = nativeGetAgentProcesses(AGENT_NAMES);
	} catch {
		result = [];
	}

	cache = { timestamp: Date.now(), result };
	return result;
}

/**
 * Collect the set of workspace paths (lowercased) where a given agent
 * binary is currently running.
 */
export function getWorkspacesWithAgent(
	processes: AgentProcess[],
	agentName: string,
	excludeCommandPattern?: RegExp
): Set<string> {
	const workspaces = new Set<string>();
	for (const proc of processes) {
		if (proc.name !== agentName) continue;
		if (excludeCommandPattern && excludeCommandPattern.test(proc.commandLine)) continue;
		if (proc.cwd) {
			workspaces.add(proc.cwd.toLowerCase());
		}
	}
	return workspaces;
}

/**
 * For each workspace that has a running agent process, mark the most
 * recent inactive session as "external". Sessions are grouped by their
 * workspace field (case-insensitive) so that future workspace splits
 * are handled correctly.
 */
export function markExternalSessions(
	sessions: AgentRepoSessionSummary[],
	activeWorkspaces: Set<string>
): void {
	const byWorkspace = new Map<string, AgentRepoSessionSummary[]>();
	for (const session of sessions) {
		const key = session.workspace.toLowerCase();
		let list = byWorkspace.get(key);
		if (!list) {
			list = [];
			byWorkspace.set(key, list);
		}
		list.push(session);
	}

	for (const [workspace, workspaceSessions] of byWorkspace) {
		if (!activeWorkspaces.has(workspace)) continue;

		let mostRecent: AgentRepoSessionSummary | null = null;
		for (const s of workspaceSessions) {
			if (s.status !== 'inactive') continue;
			if (!mostRecent || s.timestamp > mostRecent.timestamp) {
				mostRecent = s;
			}
		}

		if (mostRecent) {
			mostRecent.status = 'external';
		}
	}
}
