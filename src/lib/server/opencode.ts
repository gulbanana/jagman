import {
	createOpencode,
	createOpencodeClient,
	type OpencodeClient
} from '@opencode-ai/sdk';
import type {
	Session as OcSession,
	SessionStatus as OcSessionStatus,
	AssistantMessage as OcAssistantMessage,
	TextPart as OcTextPart,
	ToolPart as OcToolPart
} from '@opencode-ai/sdk';
import type { Agent, AgentRepo, AgentRepoSession } from './agent';
import type { AgentBrand } from '../brands';
import type { AgentSession, LogEntry, SessionMode, SessionStatus } from '../messages';

/**
 * Server lifecycle management.
 *
 * The OpenCode server supports multi-directory operation via a per-client
 * `directory` header. JAGMAN starts a single server process and creates
 * one client per project directory to scope requests appropriately.
 */
let serverHandle: { url: string; close(): void } | null = null;
const clients = new Map<string, OpencodeClient>();

/** Session ID → repo path, populated during loadRepos for fast lookups in loadSession. */
const sessionRepoCache = new Map<string, string>();

async function ensureServer(): Promise<string> {
	if (!serverHandle) {
		const { server } = await createOpencode({ port: 0 });
		serverHandle = server;
	}
	return serverHandle.url;
}

async function getClient(directory: string): Promise<OpencodeClient> {
	const key = directory.toLowerCase();
	let client = clients.get(key);
	if (!client) {
		const baseUrl = await ensureServer();
		client = createOpencodeClient({ baseUrl, directory });
		clients.set(key, client);
	}
	return client;
}

/** Shut down the managed OpenCode server and clear all cached state. */
export function closeOpenCodeServers(): void {
	if (serverHandle) {
		serverHandle.close();
		serverHandle = null;
	}
	clients.clear();
	sessionRepoCache.clear();
}

function mapOcStatus(status: OcSessionStatus | undefined): SessionStatus {
	if (!status) return 'completed';
	switch (status.type) {
		case 'busy':
			return 'running';
		case 'retry':
			return 'waiting';
		case 'idle':
		default:
			return 'completed';
	}
}

function mapOcMode(mode: string | null): SessionMode | null {
	if (!mode) return null;
	if (mode === 'plan') return 'plan';
	return 'standard';
}

function toTimestamp(unixSeconds: number): string {
	return new Date(unixSeconds * 1000).toISOString();
}

export default class OpenCodeAgent implements Agent {
	brand: AgentBrand = 'oc';

	async loadRepos(repoPaths: string[]): Promise<AgentRepo[]> {
		return Promise.all(repoPaths.map((path) => this.loadRepo(path)));
	}

	private async loadRepo(repoPath: string): Promise<AgentRepo> {
		const client = await getClient(repoPath);

		const [sessionsList, statusMap, vcsInfo] = await Promise.all([
			client.session.list().then((r) => r.data ?? []),
			client.session
				.status()
				.then((r) => (r.data ?? {}) as Record<string, OcSessionStatus>),
			client.vcs.get().then((r) => r.data ?? { branch: 'HEAD' })
		]);

		const sessions = await Promise.all(
			sessionsList.map((session) =>
				this.mapSession(client, session, statusMap, repoPath)
			)
		);

		sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

		return {
			path: repoPath,
			branch: vcsInfo.branch || 'HEAD',
			sessions
		};
	}

	private async mapSession(
		client: OpencodeClient,
		session: OcSession,
		statusMap: Record<string, OcSessionStatus>,
		repoPath: string
	): Promise<AgentRepoSession> {
		sessionRepoCache.set(session.id, repoPath);

		const result = await client.session.messages({
			path: { id: session.id }
		});
		const messages = result.data ?? [];
		let mode: SessionMode | null = null;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].info.role === 'assistant') {
				mode = mapOcMode(
					(messages[i].info as OcAssistantMessage).mode
				);
				break;
			}
		}

		return {
			id: session.id,
			slug: session.title || session.id,
			status: mapOcStatus(statusMap[session.id]),
			mode,
			timestamp: toTimestamp(session.time.updated)
		};
	}

	async loadSession(
		id: string
	): Promise<Omit<AgentSession, 'brand'> | null> {
		const repoPath = sessionRepoCache.get(id);
		if (repoPath) {
			return this.fetchSession(id, repoPath);
		}
		// Fallback: try all known clients
		for (const [dir] of clients) {
			const result = await this.fetchSession(id, dir);
			if (result) return result;
		}
		return null;
	}

	private async fetchSession(
		id: string,
		directory: string
	): Promise<Omit<AgentSession, 'brand'> | null> {
		const client = await getClient(directory);

		const [sessionResult, messagesResult] = await Promise.all([
			client.session.get({ path: { id } }),
			client.session.messages({ path: { id } })
		]);

		const session = sessionResult.data;
		const messages = messagesResult.data ?? [];

		if (!session) return null;

		const log: LogEntry[] = [];

		for (const { info, parts } of messages) {
			const timestamp = toTimestamp(info.time.created);

			if (info.role === 'user') {
				const textParts = parts.filter(
					(p): p is OcTextPart => p.type === 'text'
				);
				const text = textParts.map((p) => p.text).join('\n');
				if (text) {
					log.push({ type: 'user', text, timestamp });
				}
			} else if (info.role === 'assistant') {
				const textParts = parts.filter(
					(p): p is OcTextPart => p.type === 'text'
				);
				const text = textParts.map((p) => p.text).join('\n');
				if (text) {
					log.push({ type: 'assistant', text, timestamp });
				}

				const toolParts = parts.filter(
					(p): p is OcToolPart => p.type === 'tool'
				);
				for (const toolPart of toolParts) {
					let toolTimestamp = timestamp;
					if (
						toolPart.state.status === 'running' ||
						toolPart.state.status === 'completed' ||
						toolPart.state.status === 'error'
					) {
						toolTimestamp = toTimestamp(
							toolPart.state.time.start
						);
					}

					log.push({
						type: 'tool_use',
						tool: toolPart.tool,
						args: new Map(
							Object.entries(toolPart.state.input)
						),
						success:
							toolPart.state.status === 'completed',
						timestamp: toolTimestamp
					});
				}
			}
		}

		return {
			id,
			slug: session.title || id,
			log
		};
	}
}
