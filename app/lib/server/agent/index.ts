import { homedir } from 'node:os';
import type { AgentBrand } from "../../brands";
import type { AgentDetail, AgentRepoSummary, RepoSessionSummary, RepoError, RepoStub, RepoSummary, } from "../../messages";
import { ActiveOrder, activeFirstCompare } from "../../activity";
import ClaudeAgent from "./claude";
import CopilotAgent from "./copilot";
import OpenCodeAgent from "./opencode";
import { listRepositories } from "../db/repository";

export interface Agent {
	brand: AgentBrand;
	loadSessions(workspacePaths: string[], maxSessions: number): Promise<AgentRepoSummary[]>;
	loadSession(id: string): Promise<Omit<AgentDetail, 'brand'> | null>;
}

let wellKnownAgents = [new ClaudeAgent(), new OpenCodeAgent(), new CopilotAgent()];

const sessionOrder = new ActiveOrder();

export function configuredAgents(): Agent[] {
	return wellKnownAgents;
}

const HOME = homedir();

function toDisplayPath(path: string): string {
	if (path.toLowerCase().startsWith(HOME.toLowerCase())) {
		return '~' + path.slice(HOME.length);
	}
	return path;
}

export function getRepoStubs(): RepoStub[] {
	return listRepositories().map((repo) => ({
		path: repo.path,
		displayPath: toDisplayPath(repo.path),
	}));
}

export async function getRepoSummary(repoPath: string): Promise<RepoSummary> {
	const sessions: RepoSessionSummary[] = [];
	const errors: RepoError[] = [];
	let branch = '';

	const results = await Promise.allSettled(
		wellKnownAgents.map((agent) => agent.loadSessions([repoPath], 10))
	);

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === 'rejected') {
			const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
			errors.push({ brand: wellKnownAgents[i].brand, message });
			continue;
		}

		for (const repo of result.value) {
			const brandedSessions = repo.sessions.map((s): RepoSessionSummary => ({
				...s,
				mode: s.status == 'inactive' ? null : s.mode,
				brand: wellKnownAgents[i].brand,
			}));
			sessions.push(...brandedSessions);

			if (!branch || branch === 'HEAD') {
				branch = repo.branch;
			}
		}
	}

	// Sort sessions: active first in FIFO order, then inactive by timestamp descending
	const activeSessionIds = sessions
		.filter((s) => s.status === 'running' || s.status === 'waiting' || s.status === 'external')
		.map((s) => s.id);
	const sessionIndex = sessionOrder.update(activeSessionIds);

	sessions.sort((a, b) =>
		activeFirstCompare(sessionIndex, a.id, a.timestamp, b.id, b.timestamp)
	);

	return {
		path: toDisplayPath(repoPath),
		branch,
		sessions,
		errors,
	};
}

export async function loadAgentDetail(id: string): Promise<AgentDetail | null> {
	const results = await Promise.allSettled(
		wellKnownAgents.map((agent) => agent.loadSession(id))
	);

	const errors: { brand: AgentBrand; message: string }[] = [];

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === 'fulfilled' && result.value) {
			return { ...result.value, brand: wellKnownAgents[i].brand };
		}
		if (result.status === 'rejected') {
			const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
			errors.push({ brand: wellKnownAgents[i].brand, message });
		}
	}

	// No session found. If there were errors, surface them — one of the failing
	// agents might have owned this session but couldn't load it.
	if (errors.length > 0) {
		const detail = errors.map((e) => `[${e.brand}] ${e.message}`).join('\n');
		throw new Error(`Session not found. Agent errors:\n${detail}`);
	}

	return null;
}
