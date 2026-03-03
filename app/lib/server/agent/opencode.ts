import { spawn, type ChildProcess } from 'node:child_process';
import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';
import type {
	Session as OcSession,
	SessionStatus as OcSessionStatus,
	AssistantMessage as OcAssistantMessage,
	TextPart as OcTextPart,
	ToolPart as OcToolPart
} from '@opencode-ai/sdk';
import type { Agent } from '.';
import type { AgentBrand } from '../../brands';
import type { AgentDetail, AgentRepoSummary, AgentRepoSessionSummary, LogEntry, SessionMode, SessionStatus } from '../../messages';
import { buildLastEntries } from './last-entries';
import { getAgentProcesses, getWorkspacesWithAgent, markExternalSessions } from '../processes';
import { initService } from '$lib/server/state';

/**
 * Server lifecycle management.
 *
 * JAGMAN starts a single OpenCode server process and creates one SDK
 * client per project directory. The SDK's `createOpencodeClient` stamps
 * every request with an `x-opencode-directory` header, which the server
 * uses to establish an Instance context (project, config, VCS, etc.).
 *
 * Directory scoping: OpenCode derives its internal project ID from the
 * git root commit, so repos without git (e.g. jj-only) all collapse
 * into a single global project. This means the header-based Instance
 * context alone does NOT isolate collection queries like session.list()
 * or session.status(). To get correct per-directory results we pass
 * the `directory` query parameter explicitly — the server uses it as
 * a direct DB filter in addition to the Instance-level project scope.
 * By-ID operations (session.get, session.messages, session.prompt,
 * permission responses, etc.) work fine without it since they look up
 * by unique session ID.
 *
 * We spawn the server process ourselves rather than using the SDK's
 * `createOpencodeServer`, because the SDK uses `spawn('opencode', ...)`
 * without `shell: true`, which fails on Windows where the `opencode`
 * binary is behind a `.cmd` shim.
 */

type OcState = {
	serverHandle: { url: string; proc: ChildProcess } | null;
	/** Coalesces concurrent ensureServer() calls so only one spawn occurs. */
	serverPending: Promise<string> | null;
	clients: Map<string, OpencodeClient>;
	sessionRepoCache: Map<string, string>;
};

const oc = initService<OcState>('opencode', () => ({
	serverHandle: null,
	serverPending: null,
	clients: new Map(),
	sessionRepoCache: new Map(),
}), (s) => {
	if (s.serverHandle) {
		s.serverHandle.proc.kill();
		s.serverHandle = null;
	}
	s.serverPending = null;
	s.clients.clear();
	s.sessionRepoCache.clear();
});

/** Shut down the managed OpenCode server and clear all cached state. */
export function stopServer(): void {
	if (oc.serverHandle) {
		oc.serverHandle.proc.kill();
		oc.serverHandle = null;
	}
	oc.serverPending = null;
	oc.clients.clear();
	oc.sessionRepoCache.clear();
}

async function ensureServer(): Promise<string> {
	if (oc.serverHandle) return oc.serverHandle.url;

	if (!oc.serverPending) {
		oc.serverPending = spawnServer().then(
			(handle) => {
				oc.serverHandle = handle;
				oc.serverPending = null;
				return handle.url;
			},
			(err) => {
				oc.serverPending = null;
				throw err;
			}
		);
	}
	return oc.serverPending;
}

async function spawnServer(): Promise<{ url: string; proc: ChildProcess }> {
	const timeout = 5000;
	const args = ['serve', '--hostname=127.0.0.1', '--port=0'];
	const proc = spawn('opencode', args, {
		shell: true,
		env: {
			...process.env,
			OPENCODE_CONFIG_CONTENT: JSON.stringify({})
		}
	});

	const url = await new Promise<string>((resolve, reject) => {
		const id = setTimeout(() => {
			reject(new Error(`Timeout waiting for opencode server to start after ${timeout}ms`));
		}, timeout);

		let output = '';

		proc.stdout?.on('data', (chunk: Buffer) => {
			output += chunk.toString();
			const lines = output.split('\n');
			for (const line of lines) {
				if (line.startsWith('opencode server listening')) {
					const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
					if (!match) {
						clearTimeout(id);
						reject(new Error(`Failed to parse server url from output: ${line}`));
						return;
					}
					clearTimeout(id);
					resolve(match[1]);
					return;
				}
			}
		});

		proc.stderr?.on('data', (chunk: Buffer) => {
			output += chunk.toString();
		});

		proc.on('exit', (code) => {
			clearTimeout(id);
			let msg = `opencode server exited with code ${code}`;
			if (output.trim()) {
				msg += `\nServer output: ${output}`;
			}
			reject(new Error(msg));
		});

		proc.on('error', (error) => {
			clearTimeout(id);
			reject(error);
		});
	});

	return { url, proc };
}

async function getClient(directory: string): Promise<OpencodeClient> {
	const key = directory.toLowerCase();
	let client = oc.clients.get(key);
	if (!client) {
		const baseUrl = await ensureServer();
		client = createOpencodeClient({ baseUrl, directory });
		oc.clients.set(key, client);
	}
	return client;
}

function mapOcStatus(status: OcSessionStatus | undefined): SessionStatus {
	if (!status) return 'inactive';
	switch (status.type) {
		case 'busy':
			return 'running';
		case 'retry':
			return 'waiting';
		case 'idle':
		default:
			return 'inactive';
	}
}

function mapOcMode(mode: string | null): SessionMode | null {
	if (!mode) return null;
	if (mode === 'plan') return 'plan';
	return 'standard';
}

function toTimestamp(ms: number): string {
	return new Date(ms).toISOString();
}

export default class OpenCodeAgent implements Agent {
	brand: AgentBrand = 'oc';

	async loadSessions(workspacePaths: string[], maxSessions: number): Promise<AgentRepoSummary[]> {
		const repos = await Promise.all(workspacePaths.map((path) => this.loadRepo(path, maxSessions)));

		const processes = getAgentProcesses();
		const activeWorkspaces = getWorkspacesWithAgent(
			processes,
			'opencode',
			/\bopencode(?:\.exe)?\s+(?:serve|x|run)\b/
		);
		markExternalSessions(repos.flatMap((r) => r.sessions), activeWorkspaces);

		return repos;
	}

	private async loadRepo(repoPath: string, maxSessions: number): Promise<AgentRepoSummary> {
		const client = await getClient(repoPath);

		const [sessionsList, statusMap, vcsInfo] = await Promise.all([
			client.session
				.list({ query: { directory: repoPath } })
				.then((r) => r.data ?? []),
			client.session
				.status({ query: { directory: repoPath } })
				.then((r) => (r.data ?? {}) as Record<string, OcSessionStatus>),
			client.vcs.get().then((r) => r.data ?? { branch: 'HEAD' })
		]);

		sessionsList.sort((a, b) => b.time.updated - a.time.updated);
		const recentSessions = sessionsList.slice(0, maxSessions);

		const sessions = await Promise.all(
			recentSessions.map((session) =>
				this.mapSession(client, session, statusMap, repoPath)
			)
		);

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
	): Promise<AgentRepoSessionSummary> {
		oc.sessionRepoCache.set(session.id, repoPath);

		const result = await client.session.messages({
			path: { id: session.id }
		});
		const messages = result.data ?? [];

		let mode: SessionMode | null = null;
		let seq = 0;
		let lastAssistant: { text: string; timestamp: string; seq: number } | null = null;
		let lastToolUse: { id: string; tool: string; args: Record<string, unknown>; timestamp: string; seq: number } | null = null;
		const toolResults = new Map<string, boolean>();

		for (const msg of messages) {
			if (msg.info.role !== 'assistant') continue;
			const timestamp = toTimestamp(msg.info.time.created);

			mode = mapOcMode((msg.info as OcAssistantMessage).mode) ?? mode;

			const textParts = msg.parts.filter(
				(p): p is OcTextPart => p.type === 'text'
			);
			const text = textParts.map((p) => p.text).join('\n');
			if (text) {
				lastAssistant = { text, timestamp, seq: seq++ };
			}

			const toolParts = msg.parts.filter(
				(p): p is OcToolPart => p.type === 'tool'
			);
			for (const tp of toolParts) {
				let toolTimestamp = timestamp;
				if (
					tp.state.status === 'running' ||
					tp.state.status === 'completed' ||
					tp.state.status === 'error'
				) {
					toolTimestamp = toTimestamp(tp.state.time.start);
				}
				const toolId = `${session.id}-${tp.tool}-${seq}`;
				const success = tp.state.status === 'completed';
				toolResults.set(toolId, success);
				lastToolUse = {
					id: toolId,
					tool: tp.tool,
					args: tp.state.input,
					timestamp: toolTimestamp,
					seq: seq++
				};
			}
		}

		return {
			id: session.id,
			workspace: repoPath,
			title: session.title || session.id,
			status: mapOcStatus(statusMap[session.id]),
			mode,
			timestamp: session.time.updated,
			lastEntries: buildLastEntries(lastAssistant, lastToolUse, toolResults)
		};
	}

	async loadSession(
		id: string
	): Promise<Omit<AgentDetail, 'brand'> | null> {
		const repoPath = oc.sessionRepoCache.get(id);
		if (repoPath) {
			return this.fetchSession(id, repoPath);
		}
		// Fallback: try all known clients
		for (const [dir] of oc.clients) {
			const result = await this.fetchSession(id, dir);
			if (result) return result;
		}
		return null;
	}

	private async fetchSession(
		id: string,
		directory: string
	): Promise<Omit<AgentDetail, 'brand'> | null> {
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
			title: session.title || id,
			log
		};
	}
}
