import { readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Agent, Repo } from '$lib/messages';

const REPO_PATHS = [
	'C:\\Users\\banana\\Documents\\code\\jagman',
	'C:\\Users\\banana\\Documents\\code\\gg',
	'C:\\Users\\banana\\Documents\\code\\lockhaven'
];

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/** Cached index of workspace cwd → project directory name */
let projectIndex: Map<string, string> | null = null;

interface SessionHeader {
	sessionId: string;
	slug: string | undefined;
	timestamp: string;
	gitBranch: string;
}

/**
 * Read lines from a .jsonl file until finding the first "user"-type message.
 * Returns the parsed fields, or null if not found within 50 lines.
 */
async function readFirstUserMessage(
	filePath: string
): Promise<Record<string, unknown> | null> {
	const stream = createReadStream(filePath, { encoding: 'utf-8' });
	const rl = createInterface({ input: stream, crlfDelay: Infinity });

	let lineCount = 0;
	try {
		for await (const line of rl) {
			if (++lineCount > 50) break;
			try {
				const obj = JSON.parse(line);
				if (obj.type === 'user') return obj;
			} catch {
				continue;
			}
		}
	} finally {
		rl.close();
		stream.destroy();
	}
	return null;
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

			const msg = await readFirstUserMessage(join(dirPath, firstJsonl));
			if (msg && typeof msg.cwd === 'string') {
				index.set(msg.cwd.toLowerCase(), dirName);
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
 * Read all sessions for a project directory and return Agent objects
 * sorted newest-first by timestamp.
 */
async function readProjectSessions(
	projectDirName: string
): Promise<{ agents: Agent[]; branch: string }> {
	const projectPath = join(PROJECTS_DIR, projectDirName);

	let allEntries: string[];
	try {
		allEntries = await readdir(projectPath);
	} catch {
		return { agents: [], branch: '' };
	}

	const jsonlFiles = allEntries.filter((e) => e.endsWith('.jsonl'));

	const headers = await Promise.all(
		jsonlFiles.map(async (file): Promise<SessionHeader | null> => {
			const msg = await readFirstUserMessage(join(projectPath, file));
			if (!msg) return null;
			return {
				sessionId: msg.sessionId as string,
				slug: msg.slug as string | undefined,
				timestamp: msg.timestamp as string,
				gitBranch: (msg.gitBranch as string) || ''
			};
		})
	);

	const sessions = headers
		.filter((h): h is SessionHeader => h !== null)
		.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);

	const branch = sessions[0]?.gitBranch ?? '';

	const agents: Agent[] = sessions.map((session, index) => ({
		id: session.sessionId,
		name: 'claude',
		// TEMPORARY: fake active statuses for UI testing
		status: index === 0 ? 'running' : index === 1 ? 'waiting' : 'completed',
		slug: session.slug ?? session.sessionId,
		log: []
	}));

	return { agents, branch };
}

/**
 * Load repos with real Claude Code session data.
 */
export async function loadRepos(): Promise<Repo[]> {
	const index = await getProjectIndex();

	const repos = await Promise.all(
		REPO_PATHS.map(async (repoPath) => {
			const projectDirName = index.get(repoPath.toLowerCase());
			if (!projectDirName) {
				return { path: repoPath, branch: 'HEAD', agents: [] };
			}

			const { agents, branch } = await readProjectSessions(projectDirName);
			return {
				path: repoPath,
				branch: branch || 'HEAD',
				agents
			};
		})
	);

	return repos;
}
