import { query } from '$app/server';
import { getAgentSession } from '$lib/server/agent';
import type { AgentSession } from '$lib/messages';

export const getAgentDetail = query('unchecked', async (id: string): Promise<AgentSession> => {
	const session = await getAgentSession(id);
	if (!session) throw new Error('Session not found.');
	return session;
});
