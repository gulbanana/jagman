import { describe, it, expect } from 'vitest';
import { CopilotClient, CopilotSession, approveAll, defineTool } from '@github/copilot-sdk';
import type { SessionEvent, SessionMetadata, SessionContext } from '@github/copilot-sdk';
import CopilotAgent from './copilot';

describe('@github/copilot-sdk package', () => {
	it('exports CopilotClient class', () => {
		expect(CopilotClient).toBeTypeOf('function');
		expect(CopilotClient.prototype.start).toBeTypeOf('function');
		expect(CopilotClient.prototype.stop).toBeTypeOf('function');
		expect(CopilotClient.prototype.createSession).toBeTypeOf('function');
		expect(CopilotClient.prototype.resumeSession).toBeTypeOf('function');
		expect(CopilotClient.prototype.listSessions).toBeTypeOf('function');
		expect(CopilotClient.prototype.getState).toBeTypeOf('function');
		expect(CopilotClient.prototype.ping).toBeTypeOf('function');
	});

	it('exports CopilotSession class', () => {
		expect(CopilotSession).toBeTypeOf('function');
		expect(CopilotSession.prototype.send).toBeTypeOf('function');
		expect(CopilotSession.prototype.sendAndWait).toBeTypeOf('function');
		expect(CopilotSession.prototype.getMessages).toBeTypeOf('function');
		expect(CopilotSession.prototype.destroy).toBeTypeOf('function');
		expect(CopilotSession.prototype.abort).toBeTypeOf('function');
		expect(CopilotSession.prototype.on).toBeTypeOf('function');
	});

	it('exports approveAll permission handler', () => {
		expect(approveAll).toBeTypeOf('function');
		const result = approveAll(
			{ kind: 'shell' },
			{ sessionId: 'test' }
		);
		expect(result).toEqual({ kind: 'approved' });
	});

	it('exports defineTool helper', () => {
		expect(defineTool).toBeTypeOf('function');

		const tool = defineTool('test_tool', {
			description: 'A test tool',
			handler: async () => 'result'
		});

		expect(tool.name).toBe('test_tool');
		expect(tool.description).toBe('A test tool');
		expect(tool.handler).toBeTypeOf('function');
	});

	it('instantiates CopilotClient without starting', () => {
		const client = new CopilotClient({ autoStart: false });
		expect(client.getState()).toBe('disconnected');
	});
});

describe('CopilotAgent', () => {
	it('has brand "gc"', () => {
		const agent = new CopilotAgent();
		expect(agent.brand).toBe('gc');
	});

	it('implements the Agent interface', () => {
		const agent = new CopilotAgent();
		expect(agent.loadRepos).toBeTypeOf('function');
		expect(agent.loadSession).toBeTypeOf('function');
	});
});

describe('CopilotAgent event mapping', () => {
	// Access mapEventsToLog via a subclass that exposes it for testing
	class TestCopilotAgent extends CopilotAgent {
		public testMapEventsToLog(events: SessionEvent[]) {
			// @ts-expect-error accessing private method for testing
			return this.mapEventsToLog(events);
		}

		public testFirstUserMessage(events: SessionEvent[]) {
			// @ts-expect-error accessing private method for testing
			return this.firstUserMessage(events);
		}
	}

	function makeEvent<T extends SessionEvent['type']>(
		type: T,
		data: Extract<SessionEvent, { type: T }>['data']
	): SessionEvent {
		return {
			id: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			parentId: null,
			type,
			data
		} as SessionEvent;
	}

	it('maps user.message events to user log entries', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('user.message', { content: 'Hello world' })
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({ type: 'user', text: 'Hello world' });
	});

	it('maps assistant.message events to assistant log entries', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('assistant.message', { messageId: 'msg-1', content: 'Hi there' })
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({ type: 'assistant', text: 'Hi there' });
	});

	it('pairs tool.execution_start with tool.execution_complete by toolCallId', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('tool.execution_start', {
				toolCallId: 'tc-1',
				toolName: 'read_file',
				arguments: { path: '/tmp/test.txt' }
			}),
			makeEvent('tool.execution_complete', {
				toolCallId: 'tc-1',
				success: true
			})
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({
			type: 'tool_use',
			tool: 'read_file',
			success: true
		});
		expect((log[0] as { args: Map<string, unknown> }).args.get('path')).toBe('/tmp/test.txt');
	});

	it('handles tool.execution_complete without matching start', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('tool.execution_complete', {
				toolCallId: 'tc-orphan',
				success: false
			})
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({
			type: 'tool_use',
			tool: 'unknown',
			success: false
		});
	});

	it('emits incomplete tools that never completed', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('tool.execution_start', {
				toolCallId: 'tc-pending',
				toolName: 'bash',
				arguments: { command: 'ls' }
			})
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({
			type: 'tool_use',
			tool: 'bash',
			success: true
		});
	});

	it('skips empty user and assistant messages', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('user.message', { content: '' }),
			makeEvent('assistant.message', { messageId: 'msg-1', content: '' })
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(0);
	});

	it('ignores non-message event types', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('session.mode_changed', { previousMode: 'interactive', newMode: 'plan' }),
			makeEvent('session.idle', {}),
			makeEvent('user.message', { content: 'test' })
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({ type: 'user', text: 'test' });
	});

	it('maps a full conversation with interleaved events', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('user.message', { content: 'Fix the bug' }),
			makeEvent('assistant.message', { messageId: 'msg-1', content: 'Let me look at that.' }),
			makeEvent('tool.execution_start', {
				toolCallId: 'tc-1',
				toolName: 'read_file',
				arguments: { path: 'src/main.ts' }
			}),
			makeEvent('tool.execution_complete', { toolCallId: 'tc-1', success: true }),
			makeEvent('assistant.message', { messageId: 'msg-2', content: 'I found the issue.' }),
			makeEvent('tool.execution_start', {
				toolCallId: 'tc-2',
				toolName: 'edit_file',
				arguments: { path: 'src/main.ts', content: 'fixed' }
			}),
			makeEvent('tool.execution_complete', { toolCallId: 'tc-2', success: true }),
			makeEvent('assistant.message', { messageId: 'msg-3', content: 'Fixed!' })
		];

		const log = agent.testMapEventsToLog(events);
		expect(log).toHaveLength(6);
		expect(log.map((e) => e.type)).toEqual([
			'user', 'assistant', 'tool_use', 'assistant', 'tool_use', 'assistant'
		]);
	});

	it('extracts first user message text', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('assistant.message', { messageId: 'msg-1', content: 'Welcome' }),
			makeEvent('user.message', { content: 'First line\nSecond line' }),
			makeEvent('user.message', { content: 'Another message' })
		];

		const result = agent.testFirstUserMessage(events);
		expect(result).toBe('First line');
	});

	it('returns null when no user messages exist', () => {
		const agent = new TestCopilotAgent();
		const events: SessionEvent[] = [
			makeEvent('assistant.message', { messageId: 'msg-1', content: 'Hello' })
		];

		const result = agent.testFirstUserMessage(events);
		expect(result).toBeNull();
	});
});
