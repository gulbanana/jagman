import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
	scanSession,
	readFirstUserRecord,
	readSessionOverview,
	readAllRecords,
	getUserText,
	getAssistantText,
	isMetaMessage,
	getToolUses,
	getToolResults
} from './jsonl';

// -- Fixture helpers --

/** Minimal user record JSON */
function userRecord(overrides: Record<string, unknown> = {}): string {
	return JSON.stringify({
		type: 'user',
		uuid: 'u1',
		parentUuid: null,
		timestamp: '2026-01-01T00:00:00.000Z',
		sessionId: 'sess-1',
		slug: null,
		cwd: 'C:\\project',
		gitBranch: 'main',
		isSidechain: false,
		message: { role: 'user', content: 'hello' },
		...overrides
	});
}

/** Minimal assistant record JSON */
function assistantRecord(overrides: Record<string, unknown> = {}): string {
	return JSON.stringify({
		type: 'assistant',
		uuid: 'a1',
		parentUuid: 'u1',
		timestamp: '2026-01-01T00:00:01.000Z',
		isSidechain: false,
		message: {
			role: 'assistant',
			model: 'claude-opus-4-6',
			content: [{ type: 'text', text: 'hi there' }],
			stop_reason: 'end_turn'
		},
		...overrides
	});
}

/** Non-user/assistant record types that should be skipped */
function fileHistorySnapshot(): string {
	return JSON.stringify({
		type: 'file-history-snapshot',
		messageId: 'fhs-1',
		snapshot: {},
		isSnapshotUpdate: false
	});
}

function systemRecord(content: string): string {
	return JSON.stringify({
		type: 'system',
		subtype: 'local_command',
		content,
		level: 'info',
		uuid: 'sys-1',
		parentUuid: null,
		isSidechain: false,
		cwd: 'C:\\project',
		sessionId: 'sess-1',
		timestamp: '2026-01-01T00:00:00.000Z'
	});
}

function progressRecord(): string {
	return JSON.stringify({ type: 'progress', uuid: 'p1', isSidechain: false });
}

// -- Test setup --

let tempDir: string;

beforeEach(() => {
	tempDir = join(tmpdir(), `jsonl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

function writeFixture(name: string, lines: string[]): string {
	const filePath = join(tempDir, name);
	writeFileSync(filePath, lines.join('\n') + '\n');
	return filePath;
}

// -- Tests --

describe('scanSession', () => {
	it('skips non-user/assistant record types', async () => {
		const filePath = writeFixture('mixed.jsonl', [
			fileHistorySnapshot(),
			systemRecord('/doctor'),
			progressRecord(),
			userRecord({ uuid: 'u1' }),
			assistantRecord({ uuid: 'a1' })
		]);

		const types: string[] = [];
		await scanSession(filePath, (record) => {
			types.push(record.type);
		});

		expect(types).toEqual(['user', 'assistant']);
	});

	it('handles empty files', async () => {
		const filePath = writeFixture('empty.jsonl', []);

		const records: unknown[] = [];
		await scanSession(filePath, (record) => {
			records.push(record);
		});

		expect(records).toEqual([]);
	});

	it('skips malformed JSON lines', async () => {
		const filePath = writeFixture('bad.jsonl', [
			'{not valid json',
			userRecord()
		]);

		const types: string[] = [];
		await scanSession(filePath, (record) => {
			types.push(record.type);
		});

		expect(types).toEqual(['user']);
	});

	it('supports early exit', async () => {
		const filePath = writeFixture('early.jsonl', [
			userRecord({ uuid: 'u1' }),
			userRecord({ uuid: 'u2' }),
			userRecord({ uuid: 'u3' })
		]);

		let count = 0;
		await scanSession(filePath, () => {
			count++;
			return false;
		});

		expect(count).toBe(1);
	});
});

describe('readFirstUserRecord', () => {
	it('returns the first user record', async () => {
		const filePath = writeFixture('normal.jsonl', [
			userRecord({ uuid: 'u1', sessionId: 'sess-A' }),
			userRecord({ uuid: 'u2', sessionId: 'sess-A' })
		]);

		const first = await readFirstUserRecord(filePath);
		expect(first).not.toBeNull();
		expect(first!.uuid).toBe('u1');
	});

	it('skips leading non-user records', async () => {
		const filePath = writeFixture('leading.jsonl', [
			fileHistorySnapshot(),
			systemRecord('/clear'),
			progressRecord(),
			userRecord({ uuid: 'u1', sessionId: 'sess-B' })
		]);

		const first = await readFirstUserRecord(filePath);
		expect(first).not.toBeNull();
		expect(first!.sessionId).toBe('sess-B');
	});

	it('returns null when no user records exist', async () => {
		const filePath = writeFixture('no-users.jsonl', [
			fileHistorySnapshot(),
			systemRecord('/doctor'),
			assistantRecord()
		]);

		const first = await readFirstUserRecord(filePath);
		expect(first).toBeNull();
	});
});

describe('readSessionOverview', () => {
	it('returns identity fields from first user record', async () => {
		const filePath = writeFixture('identity.jsonl', [
			userRecord({ sessionId: 'sess-A', cwd: 'C:\\project', gitBranch: 'main' }),
			assistantRecord()
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview).not.toBeNull();
		expect(overview!.sessionId).toBe('sess-A');
		expect(overview!.cwd).toBe('C:\\project');
		expect(overview!.gitBranch).toBe('main');
	});

	it('returns last non-null permissionMode', async () => {
		const filePath = writeFixture('summary.jsonl', [
			userRecord({ permissionMode: 'default' }),
			assistantRecord(),
			userRecord({ permissionMode: null }),
			assistantRecord(),
			userRecord({ permissionMode: 'plan' })
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.permissionMode).toBe('plan');
	});

	it('returns null when no permissionMode present', async () => {
		const filePath = writeFixture('bare.jsonl', [
			userRecord({ permissionMode: null })
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.permissionMode).toBeNull();
	});

	it('returns firstUserText from the first non-meta user message', async () => {
		const filePath = writeFixture('first-text.jsonl', [
			userRecord({ message: { role: 'user', content: 'fix the login bug' } }),
			assistantRecord(),
			userRecord({ message: { role: 'user', content: 'now add tests' } })
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.firstUserText).toBe('fix the login bug');
	});

	it('returns null firstUserText when all user messages are meta', async () => {
		const filePath = writeFixture('meta-only-text.jsonl', [
			userRecord({ message: { role: 'user', content: '<command-name>/clear</command-name>' } }),
			assistantRecord()
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.firstUserText).toBeNull();
	});

	it('skips permissionMode on records that lack it', async () => {
		const filePath = writeFixture('partial.jsonl', [
			userRecord({ permissionMode: 'bypassPermissions' }),
			assistantRecord(),
			// Later records may lack permissionMode (newer CC versions)
			userRecord({ permissionMode: null }),
			assistantRecord()
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.permissionMode).toBe('bypassPermissions');
	});

	it('reports hasContent false for meta-only sessions', async () => {
		const filePath = writeFixture('meta-only.jsonl', [
			fileHistorySnapshot(),
			userRecord({ message: { role: 'user', content: '<local-command-caveat>system output</local-command-caveat>' } }),
			userRecord({ message: { role: 'user', content: '<command-name>/clear</command-name>' } }),
			userRecord({ message: { role: 'user', content: '<local-command-stdout></local-command-stdout>' } }),
			fileHistorySnapshot()
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.hasContent).toBe(false);
	});

	it('reports hasContent true when assistant records exist', async () => {
		const filePath = writeFixture('with-content.jsonl', [
			userRecord({ message: { role: 'user', content: 'explain this code' } }),
			assistantRecord()
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.hasContent).toBe(true);
	});

	it('reports hasContent true for non-meta user messages even without assistant', async () => {
		const filePath = writeFixture('user-only.jsonl', [
			userRecord({ message: { role: 'user', content: 'fix the bug' } })
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.hasContent).toBe(true);
	});

	it('returns null when no user records exist', async () => {
		const filePath = writeFixture('no-users.jsonl', [
			assistantRecord(),
			fileHistorySnapshot()
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview).toBeNull();
	});

	it('uses the last record timestamp, not the first', async () => {
		const filePath = writeFixture('timestamps.jsonl', [
			userRecord({ timestamp: '2026-01-01T00:00:00.000Z' }),
			assistantRecord({ timestamp: '2026-01-01T00:05:00.000Z' }),
			userRecord({ timestamp: '2026-01-01T00:10:00.000Z' }),
			assistantRecord({ timestamp: '2026-01-01T00:15:00.000Z' })
		]);

		const overview = await readSessionOverview(filePath);
		expect(overview!.lastTimestamp).toBe('2026-01-01T00:15:00.000Z');
	});
});

describe('readAllRecords', () => {
	it('returns user and assistant records', async () => {
		const filePath = writeFixture('all.jsonl', [
			userRecord({ uuid: 'u1' }),
			assistantRecord({ uuid: 'a1' }),
			userRecord({ uuid: 'u2' })
		]);

		const records = await readAllRecords(filePath);
		expect(records).toHaveLength(3);
		expect(records.map((r) => r.type)).toEqual(['user', 'assistant', 'user']);
	});

	it('excludes sidechain records', async () => {
		const filePath = writeFixture('sidechain.jsonl', [
			userRecord({ uuid: 'u1', isSidechain: false }),
			assistantRecord({ uuid: 'a1', isSidechain: true }),
			userRecord({ uuid: 'u2', isSidechain: false })
		]);

		const records = await readAllRecords(filePath);
		expect(records).toHaveLength(2);
	});

	it('skips non-user/assistant record types', async () => {
		const filePath = writeFixture('mixed.jsonl', [
			fileHistorySnapshot(),
			userRecord({ uuid: 'u1' }),
			progressRecord(),
			assistantRecord({ uuid: 'a1' }),
			systemRecord('output')
		]);

		const records = await readAllRecords(filePath);
		expect(records).toHaveLength(2);
	});
});

describe('getUserText', () => {
	it('extracts string content', () => {
		const record = JSON.parse(userRecord({ message: { role: 'user', content: '  hello world  ' } }));
		// parseRecord normalisation isn't applied here; test the helper directly
		expect(getUserText(record)).toBe('hello world');
	});

	it('extracts text from content blocks', () => {
		const record = JSON.parse(
			userRecord({
				message: {
					role: 'user',
					content: [
						{ type: 'text', text: 'first' },
						{ type: 'tool_result', tool_use_id: 'tu1', is_error: false },
						{ type: 'text', text: 'second' }
					]
				}
			})
		);
		expect(getUserText(record)).toBe('first\nsecond');
	});

	it('returns empty string for whitespace-only content', () => {
		const record = JSON.parse(userRecord({ message: { role: 'user', content: '   ' } }));
		expect(getUserText(record)).toBe('');
	});

	it('filters out ide_selection tags from content blocks', () => {
		const record = JSON.parse(
			userRecord({
				message: {
					role: 'user',
					content: [
						{ type: 'text', text: '<ide_selection>some code</ide_selection>' },
						{ type: 'text', text: 'fix this function' }
					]
				}
			})
		);
		expect(getUserText(record)).toBe('fix this function');
	});

	it('filters out ide_opened_file tags from content blocks', () => {
		const record = JSON.parse(
			userRecord({
				message: {
					role: 'user',
					content: [
						{ type: 'text', text: '<ide_opened_file path="src/foo.ts" />' },
						{ type: 'text', text: '<ide_selection>selected code</ide_selection>' },
						{ type: 'text', text: 'refactor this' }
					]
				}
			})
		);
		expect(getUserText(record)).toBe('refactor this');
	});
});

describe('getAssistantText', () => {
	it('extracts text blocks, skipping thinking and tool_use', () => {
		const record = JSON.parse(
			assistantRecord({
				message: {
					role: 'assistant',
					model: 'test',
					content: [
						{ type: 'thinking', thinking: 'hmm' },
						{ type: 'text', text: 'Here is the answer' },
						{ type: 'tool_use', id: 'tu1', name: 'Read', input: {} }
					],
					stop_reason: 'end_turn'
				}
			})
		);
		expect(getAssistantText(record)).toBe('Here is the answer');
	});
});

describe('isMetaMessage', () => {
	it('detects command-name messages', () => {
		const record = JSON.parse(
			userRecord({ message: { role: 'user', content: '<command-name>/clear</command-name>' } })
		);
		expect(isMetaMessage(record)).toBe(true);
	});

	it('detects local-command-stdout messages', () => {
		const record = JSON.parse(
			userRecord({ message: { role: 'user', content: '<local-command-stdout>output</local-command-stdout>' } })
		);
		expect(isMetaMessage(record)).toBe(true);
	});

	it('detects local-command-caveat messages', () => {
		const record = JSON.parse(
			userRecord({
				message: { role: 'user', content: '<local-command-caveat>Caveat: ...</local-command-caveat>' }
			})
		);
		expect(isMetaMessage(record)).toBe(true);
	});

	it('returns false for normal user messages', () => {
		const record = JSON.parse(userRecord({ message: { role: 'user', content: 'fix the login bug' } }));
		expect(isMetaMessage(record)).toBe(false);
	});
});

describe('getToolUses', () => {
	it('extracts tool use blocks', () => {
		const record = JSON.parse(
			assistantRecord({
				message: {
					role: 'assistant',
					model: 'test',
					content: [
						{ type: 'text', text: 'Let me read that' },
						{ type: 'tool_use', id: 'tu1', name: 'Read', input: { file_path: '/foo.ts' } },
						{ type: 'tool_use', id: 'tu2', name: 'Grep', input: { pattern: 'TODO' } }
					],
					stop_reason: 'end_turn'
				}
			})
		);

		const uses = getToolUses(record);
		expect(uses).toHaveLength(2);
		expect(uses[0]).toEqual({ id: 'tu1', name: 'Read', input: { file_path: '/foo.ts' } });
		expect(uses[1]).toEqual({ id: 'tu2', name: 'Grep', input: { pattern: 'TODO' } });
	});
});

describe('getToolResults', () => {
	it('extracts tool results from array content', () => {
		const record = JSON.parse(
			userRecord({
				message: {
					role: 'user',
					content: [
						{ type: 'tool_result', tool_use_id: 'tu1', is_error: false },
						{ type: 'tool_result', tool_use_id: 'tu2', is_error: true }
					]
				}
			})
		);

		const results = getToolResults(record);
		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({ toolUseId: 'tu1', isError: false });
		expect(results[1]).toEqual({ toolUseId: 'tu2', isError: true });
	});

	it('returns empty array for string content', () => {
		const record = JSON.parse(userRecord({ message: { role: 'user', content: 'hello' } }));
		expect(getToolResults(record)).toEqual([]);
	});
});
