import type { Agent, AgentRepo } from './agent';
import type { AgentBrand } from '../brands';
import type { AgentSession } from '../messages';

const FAKE_SESSION_ID = 'oc-stub-session';

export default class OpenCodeAgent implements Agent {
	brand: AgentBrand = 'oc';

	async loadRepos(): Promise<AgentRepo[]> {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		return [
			{
				path: 'C:\\Users\\banana\\Documents\\code\\jagman',
				branch: 'main',
				sessions: [
					{
						id: FAKE_SESSION_ID,
						slug: 'stub session',
						status: 'completed',
						mode: null,
						timestamp: tomorrow.toISOString()
					}
				]
			}
		];
	}

	async loadSession(id: string): Promise<Omit<AgentSession, 'brand'> | null> {
		if (id !== FAKE_SESSION_ID) return null;

		return {
			id: FAKE_SESSION_ID,
			slug: 'stub session',
			log: []
		};
	}
}
