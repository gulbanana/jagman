import { query } from '$app/server';
import { mockRepos } from '$lib/server/mock-data';
import type { Agent } from '$lib/messages';

export const getAgentDetail = query('unchecked', async (id: string): Promise<Agent | null> => {
	for (const repo of mockRepos) {
		const agent = repo.agents.find(a => a.id === id);
		if (agent) return agent;
	}
	return null;
});
