import { query } from '$app/server';
import { loadAgentDetail } from '$lib/server/agent';
import type { AgentDetail } from '$lib/messages';

export const getAgentDetail = query('unchecked', async (id: string): Promise<AgentDetail> => {
	const session = await loadAgentDetail(id);
	if (!session) throw new Error('Session not found.');
	return session;
});
