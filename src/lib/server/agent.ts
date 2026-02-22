import { homedir } from 'node:os';
import type { AgentBrand } from "../brands";
import type { Repo, RepoSession, AgentSession } from "../messages";
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
    loadRepos(): Promise<AgentRepo[]>;
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
    const repoMap = new Map<string, { path: string; branch: string; sessions: RepoSession[] }>();

    for (const agent of wellKnownAgents) {
        for (const repo of await agent.loadRepos()) {
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
                    sessions: brandedSessions
                });
            }
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
        sessions: repo.sessions
    }));
}

export async function getAgentSession(id: string): Promise<AgentSession | null> {
    for (const agent of wellKnownAgents) {
        const session = await agent.loadSession(id);
        if (session) {
            return { ...session, brand: agent.brand };
        }
    }
    return null;
}
