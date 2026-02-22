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
 * Used for cheaply extracting session metadata (sessionId, slug, cwd, gitBranch).
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

export type SessionSummary = {
	slug: string | null;
	permissionMode: string | null;
	hasContent: boolean;
};

/**
 * Scan all records in a session file and return the last non-null
 * slug and permissionMode seen, plus whether the session has any
 * displayable content (non-meta user messages or assistant responses).
 */
export async function readSessionSummary(filePath: string): Promise<SessionSummary> {
	let slug: string | null = null;
	let permissionMode: string | null = null;
	let hasContent = false;
	await scanSession(filePath, (record) => {
		if (record.type === 'user') {
			if (record.slug !== null) slug = record.slug;
			if (record.permissionMode !== null) permissionMode = record.permissionMode;
			if (!hasContent && !record.isSidechain) {
				const text = getUserText(record);
				if (text && !isMetaMessage(record)) hasContent = true;
			}
		} else if (record.type === 'assistant' && !record.isSidechain) {
			hasContent = true;
		}
	});
	return { slug, permissionMode, hasContent };
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

/** Extract the plain text from a user record's content. */
export function getUserText(record: UserRecord): string {
	const content = record.message.content;
	if (typeof content === 'string') return content.trim();
	return content
		.filter((b): b is TextBlock => b.type === 'text' && b.text.trim() !== '')
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
