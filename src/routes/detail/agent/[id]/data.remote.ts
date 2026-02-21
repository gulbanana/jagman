import { query } from '$app/server';
import { loadRepos } from '$lib/server/sessions';
import type { Agent } from '$lib/messages';

export const getAgentDetail = query('unchecked', async (id: string): Promise<Agent | null> => {
	const repos = await loadRepos();
	for (const repo of repos) {
		const agent = repo.agents.find(a => a.id === id);
		if (agent) return agent;
	}
	return null;
});
