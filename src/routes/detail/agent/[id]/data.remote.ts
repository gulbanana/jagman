import { query } from '$app/server';
import { getAgentSession } from '$lib/server/agent';
import type { AgentSession } from '$lib/messages';

export const getAgentDetail = query('unchecked', async (id: string): Promise<AgentSession | null> => {
	return getAgentSession(id);
});
