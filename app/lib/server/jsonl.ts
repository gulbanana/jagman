import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

// -- Content block types --

export type TextBlock = { type: 'text'; text: string };
export type ImageBlock = { type: 'image'; source: { type: string; media_type: string } };
export type ThinkingBlock = { type: 'thinking'; thinking: string };
export type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; is_error: boolean };

export type UserContentBlock = TextBlock | ImageBlock | ToolResultBlock;
export type AssistantContentBlock = TextBlock | ThinkingBlock | ToolUseBlock;

// -- Record types --

export type UserRecord = {
	type: 'user';
	uuid: string;
	parentUuid: string | null;
	timestamp: string;
	sessionId: string;
	slug: string | null;
	permissionMode: string | null;
	cwd: string;
	gitBranch: string;
	isSidechain: boolean;
	message: {
		role: 'user';
		content: string | UserContentBlock[];
	};
};

export type AssistantRecord = {
	type: 'assistant';
	uuid: string;
	parentUuid: string | null;
	timestamp: string;
	isSidechain: boolean;
	message: {
		role: 'assistant';
		model: string;
		content: AssistantContentBlock[];
		stop_reason: string | null;
	};
};

export type SessionRecord = UserRecord | AssistantRecord;

// -- Parsing --

function parseRecord(line: string): SessionRecord | null {
	let obj: Record<string, unknown>;
	try {
		obj = JSON.parse(line);
	} catch {
		return null;
	}

	if (obj.type === 'user' && obj.message) {
		const msg = obj.message as Record<string, unknown>;
		return {
			type: 'user',
			uuid: (obj.uuid as string) ?? '',
			parentUuid: (obj.parentUuid as string | null) ?? null,
			timestamp: (obj.timestamp as string) ?? '',
			sessionId: (obj.sessionId as string) ?? '',
			slug: (obj.slug as string) ?? null,
			permissionMode: (obj.permissionMode as string) ?? null,
			cwd: (obj.cwd as string) ?? '',
			gitBranch: (obj.gitBranch as string) ?? '',
			isSidechain: (obj.isSidechain as boolean) ?? false,
			message: {
				role: 'user',
				content: msg.content as string | UserContentBlock[]
			}
		};
	}

	if (obj.type === 'assistant' && obj.message) {
		const msg = obj.message as Record<string, unknown>;
		return {
			type: 'assistant',
			uuid: (obj.uuid as string) ?? '',
			parentUuid: (obj.parentUuid as string | null) ?? null,
			timestamp: (obj.timestamp as string) ?? '',
			isSidechain: (obj.isSidechain as boolean) ?? false,
			message: {
				role: 'assistant',
				model: (msg.model as string) ?? '',
				content: (msg.content as AssistantContentBlock[]) ?? [],
				stop_reason: (msg.stop_reason as string | null) ?? null
			}
		};
	}

	return null;
}

// -- Scanning --

/**
 * Stream through a session JSONL file, calling `visitor` for each user or
 * assistant record. The visitor can return `false` to stop early.
 */
export async function scanSession(
	filePath: string,
	visitor: (record: SessionRecord) => boolean | void
): Promise<void> {
	const stream = createReadStream(filePath, { encoding: 'utf-8' });
	const rl = createInterface({ input: stream, crlfDelay: Infinity });

	try {
		for await (const line of rl) {
			const record = parseRecord(line);
			if (record) {
				const cont = visitor(record);
				if (cont === false) break;
			}
		}
	} finally {
		rl.close();
		stream.destroy();
	}
}

/**
 * Read just the first user record from a session file (early exit).
 * Used for cheaply extracting session metadata (sessionId, cwd, gitBranch).
 */
export async function readFirstUserRecord(filePath: string): Promise<UserRecord | null> {
	let result: UserRecord | null = null;
	await scanSession(filePath, (record) => {
		if (record.type === 'user') {
			result = record;
			return false;
		}
	});
	return result;
}

export type SessionOverview = {
	sessionId: string;
	cwd: string;
	gitBranch: string;
	permissionMode: string | null;
	hasContent: boolean;
	lastTimestamp: string;
	lastAssistant: { text: string; timestamp: string; seq: number } | null;
	lastToolUse: { id: string; tool: string; args: Record<string, unknown>; timestamp: string; seq: number } | null;
	toolResults: Map<string, boolean>;
	firstUserText: string | null;
};

/**
 * Single-pass scan of a session file that extracts everything needed to
 * list the session: identity fields from the first user record, the
 * permissionMode, whether displayable content exists, the first user
 * message text (for title derivation), and the timestamp of the last
 * record (for sorting).
 */
export async function readSessionOverview(filePath: string): Promise<SessionOverview | null> {
	let sessionId: string | null = null;
	let cwd = '';
	let gitBranch = '';
	let permissionMode: string | null = null;
	let hasContent = false;
	let lastTimestamp = '';
	let firstUserText: string | null = null;

	let seq = 0;
	let lastAssistant: SessionOverview['lastAssistant'] = null;
	let lastToolUse: SessionOverview['lastToolUse'] = null;
	const toolResults = new Map<string, boolean>();

	await scanSession(filePath, (record) => {
		if (record.timestamp > lastTimestamp) {
			lastTimestamp = record.timestamp;
		}

		if (record.type === 'user') {
			if (sessionId === null) {
				sessionId = record.sessionId;
				cwd = record.cwd;
				gitBranch = record.gitBranch;
			}
			if (record.permissionMode !== null) permissionMode = record.permissionMode;
			if (!record.isSidechain && firstUserText === null) {
				const text = getUserText(record);
				if (text && !isMetaMessage(record)) {
					hasContent = true;
					firstUserText = text;
				}
			}
			if (!record.isSidechain) {
				for (const { toolUseId, isError } of getToolResults(record)) {
					toolResults.set(toolUseId, !isError);
				}
			}
		} else if (record.type === 'assistant' && !record.isSidechain) {
			hasContent = true;
			const text = getAssistantText(record);
			if (text) {
				lastAssistant = { text, timestamp: record.timestamp, seq: seq++ };
			}
			for (const block of record.message.content) {
				if (block.type === 'tool_use') {
					lastToolUse = {
						id: block.id,
						tool: block.name,
						args: block.input,
						timestamp: record.timestamp,
						seq: seq++
					};
				}
			}
		}
	});

	if (!sessionId) return null;

	return { sessionId, cwd, gitBranch, permissionMode, hasContent, lastTimestamp, lastAssistant, lastToolUse, toolResults, firstUserText };
}

/**
 * Read all non-sidechain user and assistant records from a session file.
 */
export async function readAllRecords(filePath: string): Promise<SessionRecord[]> {
	const records: SessionRecord[] = [];
	await scanSession(filePath, (record) => {
		if (!record.isSidechain) {
			records.push(record);
		}
	});
	return records;
}

// -- Text extraction helpers --

/** Check if a text block is an IDE context tag injected by the editor. */
function isIdeTag(text: string): boolean {
	const trimmed = text.trimStart();
	return trimmed.startsWith('<ide_selection') || trimmed.startsWith('<ide_opened_file');
}

/** Extract the plain text from a user record's content. */
export function getUserText(record: UserRecord): string {
	const content = record.message.content;
	if (typeof content === 'string') return content.trim();
	return content
		.filter((b): b is TextBlock => b.type === 'text' && b.text.trim() !== '' && !isIdeTag(b.text))
		.map((b) => b.text)
		.join('\n')
		.trim();
}

/** Extract the plain text (non-thinking, non-tool-use) from an assistant record. */
export function getAssistantText(record: AssistantRecord): string {
	return record.message.content
		.filter((b): b is TextBlock => b.type === 'text' && b.text.trim() !== '')
		.map((b) => b.text)
		.join('\n')
		.trim();
}

/**
 * Check if a user message is "meta" — a slash command, system output, or other
 * non-prompt content rather than a genuine user message.
 */
export function isMetaMessage(record: UserRecord): boolean {
	const text = getUserText(record).trimStart();
	return (
		text.startsWith('<command-name>') ||
		text.startsWith('<local-command-stdout>') ||
		text.startsWith('<local-command-caveat>')
	);
}

/** Extract tool use info from an assistant record's content. */
export function getToolUses(record: AssistantRecord): { id: string; name: string; input: Record<string, unknown> }[] {
	return record.message.content
		.filter((b): b is ToolUseBlock => b.type === 'tool_use')
		.map((b) => ({ id: b.id, name: b.name, input: b.input }));
}

/** Extract tool result outcomes from a user record's content. */
export function getToolResults(record: UserRecord): { toolUseId: string; isError: boolean }[] {
	const content = record.message.content;
	if (typeof content === 'string') return [];
	return content
		.filter((b): b is ToolResultBlock => b.type === 'tool_result')
		.map((b) => ({ toolUseId: b.tool_use_id, isError: b.is_error }));
}
