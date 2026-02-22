import { homedir } from 'node:os';
import type { AgentBrand } from "../brands";
import type { Repo, RepoError, RepoSession, AgentSession } from "../messages";
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

    // Attach agent-level errors to every repo (the failure affected all of them)
    if (agentErrors.length > 0) {
        for (const repo of repoMap.values()) {
            repo.errors.push(...agentErrors);
        }
    }

    const repos = [...repoMap.values()];

    // Sort sessions within each repo newest-first
    for (const repo of repos) {
        repo.sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    // Sort repos by most recent session timestamp (newest first)
    repos.sort((a, b) => {
        const aTime = a.sessions[0]?.timestamp ?? '';
        const bTime = b.sessions[0]?.timestamp ?? '';
        return bTime.localeCompare(aTime);
    });

    return repos.map((repo) => ({
        path: toDisplayPath(repo.path),
        branch: repo.branch,
        sessions: repo.sessions,
        errors: repo.errors
    }));
}

export async function getAgentSession(id: string): Promise<AgentSession | null> {
    const errors: { brand: AgentBrand; message: string }[] = [];

    for (const agent of wellKnownAgents) {
        try {
            const session = await agent.loadSession(id);
            if (session) {
                return { ...session, brand: agent.brand };
            }
        } catch (error) {
            // Session lookup failures are isolated per-agent; if one agent can't
            // find/load the session, the next agent gets a chance.
            const message = error instanceof Error ? error.message : String(error);
            errors.push({ brand: agent.brand, message });
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
