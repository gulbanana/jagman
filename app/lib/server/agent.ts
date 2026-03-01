import { homedir } from 'node:os';
import type { AgentBrand } from "../brands";
import type { AgentDetail, AgentRepoSummary, RepoSessionSummary, RepoError, RepoSummary, } from "../messages";
import { ActiveOrder, activeFirstCompare } from "./active-order";
import ClaudeAgent from "./claude";
import OpenCodeAgent from "./opencode";
import { listRepositories } from "./db/repository";

export interface Agent {
    brand: AgentBrand;
    loadRepos(repoPaths: string[], maxSessions: number): Promise<AgentRepoSummary[]>;
    loadSession(id: string): Promise<Omit<AgentDetail, 'brand'> | null>;
}

let wellKnownAgents = [new ClaudeAgent(), new OpenCodeAgent()];

const sessionOrder = new ActiveOrder();
const repoOrder = new ActiveOrder();

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

export async function getAllRepos(): Promise<RepoSummary[]> {
    const repoPaths = listRepositories().map((repo) => repo.path);

    // Collect branded sessions grouped by repo path (case-insensitive)
    const repoMap = new Map<string, { path: string; branch: string; sessions: RepoSessionSummary[]; errors: RepoError[] }>();
    const agentErrors: RepoError[] = [];

    for (const agent of wellKnownAgents) {
        let agentRepos: AgentRepoSummary[];
        try {
            agentRepos = await agent.loadRepos(repoPaths, 10);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            agentErrors.push({ brand: agent.brand, message });
            continue;
        }

        for (const repo of agentRepos) {
            const key = repo.path.toLowerCase();
            const existing = repoMap.get(key);
            const brandedSessions = repo.sessions.map((s): RepoSessionSummary => ({ ...s, mode: s.status == 'inactive' ? null : s.mode, brand: agent.brand }));

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
    for (const repoPath of repoPaths) {
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

    // Sort sessions within each repo: active first in FIFO order, then
    // inactive by timestamp descending.
    const allSessions = repos.flatMap((r) => r.sessions);
    const activeSessionIds = allSessions
        .filter((s) => s.status === 'running' || s.status === 'waiting' || s.status === 'external')
        .map((s) => s.id);
    const sessionIndex = sessionOrder.update(activeSessionIds);

    for (const repo of repos) {
        repo.sessions.sort((a, b) =>
            activeFirstCompare(sessionIndex, a.id, a.timestamp, b.id, b.timestamp)
        );
    }

    // Sort repos the same way: repos with active sessions first in FIFO
    // order, then repos without active sessions by timestamp descending.
    const activeRepoKeys = repos
        .filter((r) => r.sessions.some((s) => sessionIndex.has(s.id)))
        .map((r) => r.path.toLowerCase());
    const repoIndex = repoOrder.update(activeRepoKeys);

    repos.sort((a, b) => {
        const aTime = a.sessions[0]?.timestamp ?? 0;
        const bTime = b.sessions[0]?.timestamp ?? 0;
        return activeFirstCompare(repoIndex, a.path.toLowerCase(), aTime, b.path.toLowerCase(), bTime);
    });

    return repos.map((repo) => ({
        path: toDisplayPath(repo.path),
        branch: repo.branch,
        sessions: repo.sessions,
        errors: repo.errors
    }));
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
