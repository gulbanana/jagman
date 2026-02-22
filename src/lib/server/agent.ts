import { homedir } from 'node:os';
import type { AgentBrand } from "../brands";
import type { Repo, RepoSession, AgentSession } from "../messages";
import ClaudeAgent from "./claude";

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

let wellKnownAgents = [new ClaudeAgent()];

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
    const agentRepos: { brand: AgentBrand; repo: AgentRepo }[] = [];

    for (const agent of wellKnownAgents) {
        for (const repo of await agent.loadRepos()) {
            agentRepos.push({ brand: agent.brand, repo });
        }
    }

    // Sort repos by most recent session timestamp (newest first)
    agentRepos.sort((a, b) => {
        const aTime = a.repo.sessions[0]?.timestamp ?? '';
        const bTime = b.repo.sessions[0]?.timestamp ?? '';
        return bTime.localeCompare(aTime);
    });

    return agentRepos.map(({ brand, repo }) => ({
        path: toDisplayPath(repo.path),
        branch: repo.branch,
        sessions: repo.sessions.map((s): RepoSession => ({ ...s, brand })),
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
