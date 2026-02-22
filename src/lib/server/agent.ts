import { homedir } from 'node:os';
import type { AgentBrand } from "../brands";
import type { Repo, RepoError, RepoSession, AgentSession } from "../messages";
import { REPO_PATHS } from "./config";
import { updateActiveOrder } from "./active-sessions";
import ClaudeAgent from "./claude";
import OpenCodeAgent from "./opencode";

export type AgentRepoSession = Omit<RepoSession, 'brand'>;


export type AgentRepo = {
    path: string;
    branch: string;
    sessions: AgentRepoSession[];
};

export interface Agent {
    brand: AgentBrand;
    loadRepos(repoPaths: string[]): Promise<AgentRepo[]>;
    loadSession(id: string): Promise<Omit<AgentSession, 'brand'> | null>;
}

let wellKnownAgents = [new ClaudeAgent(), new OpenCodeAgent()];

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

export async function getAllRepos(): Promise<Repo[]> {
    // Collect branded sessions grouped by repo path (case-insensitive)
    const repoMap = new Map<string, { path: string; branch: string; sessions: RepoSession[]; errors: RepoError[] }>();
    const agentErrors: RepoError[] = [];

    for (const agent of wellKnownAgents) {
        let agentRepos: AgentRepo[];
        try {
            agentRepos = await agent.loadRepos(REPO_PATHS);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            agentErrors.push({ brand: agent.brand, message });
            continue;
        }

        for (const repo of agentRepos) {
            const key = repo.path.toLowerCase();
            const existing = repoMap.get(key);
            const brandedSessions = repo.sessions.map((s): RepoSession => ({ ...s, brand: agent.brand }));

            if (existing) {
                existing.sessions.push(...brandedSessions);
                // Keep the most informative branch name
                if (!existing.branch || existing.branch === 'HEAD') {
                    existing.branch = repo.branch;
                }
            } else {
                repoMap.set(key, {
                    path: repo.path,
                    branch: repo.branch,
                    sessions: brandedSessions,
                    errors: []
                });
            }
        }
    }

    // Ensure every configured repo path has an entry, even if all agents failed
    for (const repoPath of REPO_PATHS) {
        const key = repoPath.toLowerCase();
        if (!repoMap.has(key)) {
            repoMap.set(key, {
                path: repoPath,
                branch: '',
                sessions: [],
                errors: []
            });
        }
    }

    // Attach agent-level errors to every repo (the failure affected all of them)
    if (agentErrors.length > 0) {
        for (const repo of repoMap.values()) {
            repo.errors.push(...agentErrors);
        }
    }

	const repos = [...repoMap.values()];

	// Update the in-memory active-session ordering from the current set of
	// all sessions across every repo. Sessions that are newly active get
	// prepended; sessions that dropped to inactive are removed; existing
	// active sessions keep their position.
	const allSessions = repos.flatMap((r) => r.sessions);
	const order = updateActiveOrder(allSessions);
	const activeIndex = new Map(order.map((id, i) => [id, i]));

	// Sort sessions within each repo:
	//   1. Active sessions first, in their tracked FIFO order
	//   2. Inactive sessions after, by timestamp descending
	for (const repo of repos) {
		repo.sessions.sort((a, b) => {
			const aActive = activeIndex.has(a.id);
			const bActive = activeIndex.has(b.id);

			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;
			if (aActive && bActive) {
				return activeIndex.get(a.id)! - activeIndex.get(b.id)!;
			}
			return b.timestamp - a.timestamp;
		});
	}

	// Sort repos by most recent session timestamp (newest first)
	repos.sort((a, b) => {
		const aTime = a.sessions[0]?.timestamp ?? 0;
		const bTime = b.sessions[0]?.timestamp ?? 0;
		return bTime - aTime;
	});

    return repos.map((repo) => ({
        path: toDisplayPath(repo.path),
        branch: repo.branch,
        sessions: repo.sessions,
        errors: repo.errors
    }));
}

export async function getAgentSession(id: string): Promise<AgentSession | null> {
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
