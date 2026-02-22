import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Agent, AgentRepo, AgentRepoSession } from './agent';
import type { AgentBrand } from '../brands';
import type { AgentSession, LogEntry } from '../messages';
import {
	readFirstUserRecord,
	readSessionOverview,
	readAllRecords,
	getUserText,
	getAssistantText,
	getToolUses,
	getToolResults,
	isMetaMessage,
	type UserRecord
} from './jsonl';
import type { SessionMode } from '../messages';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/** Cached index of workspace cwd → project directory name */
let projectIndex: Map<string, string> | null = null;

/** Cached index of session ID → JSONL file path, populated by readProjectSessions */
const sessionFileCache = new Map<string, string>();

interface SessionHeader {
	sessionId: string;
	slug: string | null;
	mode: SessionMode | null;
	timestamp: number;
	gitBranch: string;
}

export function mapPermissionMode(permissionMode: string | null): SessionMode | null {
	switch (permissionMode) {
		case 'default':
		case 'acceptEdits':
			return 'standard';
		case 'plan':
			return 'plan';
		case 'bypassPermissions':
			return 'yolo';
		default:
			return null;
	}
}

/**
 * Build an index mapping workspace cwd → project directory name
 * by scanning ~/.claude/projects/ and peeking at one session per project.
 */
async function buildProjectIndex(): Promise<Map<string, string>> {
	const index = new Map<string, string>();

	let dirs: string[];
	try {
		dirs = await readdir(PROJECTS_DIR);
	} catch {
		return index;
	}

	await Promise.all(
		dirs.map(async (dirName) => {
			const dirPath = join(PROJECTS_DIR, dirName);
			try {
				const s = await stat(dirPath);
				if (!s.isDirectory()) return;
			} catch {
				return;
			}

			let entries: string[];
			try {
				entries = await readdir(dirPath);
			} catch {
				return;
			}

			const firstJsonl = entries.find((e) => e.endsWith('.jsonl'));
			if (!firstJsonl) return;

			const record = await readFirstUserRecord(join(dirPath, firstJsonl));
			if (record) {
				index.set(record.cwd.toLowerCase(), dirName);
			}
		})
	);

	return index;
}

async function getProjectIndex(): Promise<Map<string, string>> {
	if (!projectIndex) {
		projectIndex = await buildProjectIndex();
	}
	return projectIndex;
}

/**
 * Read all sessions for a project directory and return session metadata
 * sorted newest-first by timestamp.
 */
async function readProjectSessions(
	projectDirName: string
): Promise<{ sessions: AgentRepoSession[]; branch: string }> {
	const projectPath = join(PROJECTS_DIR, projectDirName);

	let allEntries: string[];
	try {
		allEntries = await readdir(projectPath);
	} catch {
		return { sessions: [], branch: '' };
	}

	const jsonlFiles = allEntries.filter((e) => e.endsWith('.jsonl'));

	const headers = await Promise.all(
		jsonlFiles.map(async (file): Promise<SessionHeader | null> => {
			const filePath = join(projectPath, file);
			const overview = await readSessionOverview(filePath);
			if (!overview || !overview.hasContent) return null;

			// Cache the session ID → file path mapping for fast lookups later
			sessionFileCache.set(overview.sessionId, filePath);

			return {
				sessionId: overview.sessionId,
				slug: overview.slug,
				mode: mapPermissionMode(overview.permissionMode),
				timestamp: new Date(overview.lastTimestamp).getTime(),
				gitBranch: overview.gitBranch
			};
		})
	);

	const sessionHeaders = headers
		.filter((h): h is SessionHeader => h !== null);

	const branch = sessionHeaders[0]?.gitBranch ?? '';

	const sessions: AgentRepoSession[] = sessionHeaders.map((session, index) => ({
		id: session.sessionId,
		status: 'inactive',
		mode: session.mode,
		slug: session.slug ?? session.sessionId,
		timestamp: session.timestamp
	}));

	return { sessions, branch };
}

/**
 * Find the JSONL file for a session by its sessionId.
 * Checks the in-memory cache first (populated by readProjectSessions),
 * then falls back to a filename-based scan (Claude Code names files `<sessionId>.jsonl`).
 */
async function findSessionFile(sessionId: string): Promise<string | null> {
	// Fast path: check cache (populated during loadRepos → readProjectSessions)
	const cached = sessionFileCache.get(sessionId);
	if (cached) return cached;

	// Slow path: scan project directories by filename
	const index = await getProjectIndex();
	const targetFilename = `${sessionId}.jsonl`;

	for (const [, projectDirName] of index) {
		const projectPath = join(PROJECTS_DIR, projectDirName);

		let entries: string[];
		try {
			entries = await readdir(projectPath);
		} catch {
			continue;
		}

		if (entries.includes(targetFilename)) {
			const filePath = join(projectPath, targetFilename);
			sessionFileCache.set(sessionId, filePath);
			return filePath;
		}
	}

	return null;
}

export default class ClaudeAgent implements Agent {
	brand: AgentBrand = 'cc';

	async loadRepos(repoPaths: string[]): Promise<AgentRepo[]> {
		const index = await getProjectIndex();

		const repos = await Promise.all(
			repoPaths.map(async (repoPath) => {
				const projectDirName = index.get(repoPath.toLowerCase());
				if (!projectDirName) {
					return { path: repoPath, branch: 'HEAD', sessions: [] };
				}

				const { sessions, branch } = await readProjectSessions(projectDirName);
				return {
					path: repoPath,
					branch: branch || 'HEAD',
					sessions
				};
			})
		);

		return repos;
	}

	async loadSession(id: string): Promise<Omit<AgentSession, 'brand'> | null> {
		const filePath = await findSessionFile(id);
		if (!filePath) return null;

		const records = await readAllRecords(filePath);
		const firstUser = records.find((r): r is UserRecord => r.type === 'user');

		// Build a map of tool_use_id → success from tool_result blocks
		const resultMap = new Map<string, boolean>();
		for (const record of records) {
			if (record.type === 'user') {
				for (const { toolUseId, isError } of getToolResults(record)) {
					resultMap.set(toolUseId, !isError);
				}
			}
		}

		const log: LogEntry[] = [];
		for (const record of records) {
			if (record.type === 'user') {
				const text = getUserText(record);
				if (text && !isMetaMessage(record)) {
					log.push({ type: 'user', text, timestamp: record.timestamp });
				}
			} else {
				const text = getAssistantText(record);
				if (text) {
					log.push({ type: 'assistant', text, timestamp: record.timestamp });
				}
				for (const { id: toolId, name, input } of getToolUses(record)) {
					log.push({
						type: 'tool_use',
						tool: name,
						args: new Map(Object.entries(input)),
						success: resultMap.get(toolId) ?? true,
						timestamp: record.timestamp
					});
				}
			}
		}

		return {
			id,
			slug: firstUser?.slug ?? id,
			log
		};
	}
}
