import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

// -- Mocks (hoisted so they're available to vi.mock factories) --

const mockSpawn = vi.hoisted(() => vi.fn());
const mockCreateOpencodeClient = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
	spawn: mockSpawn
}));

vi.mock('@opencode-ai/sdk', () => ({
	createOpencodeClient: mockCreateOpencodeClient
}));

// -- Module under test (imported after mocks are declared) --

import OpenCodeAgent, { closeOpenCodeServers } from './opencode';

// -- Helpers --

/** Minimal mock of the ChildProcess returned by spawn. */
class MockProc extends EventEmitter {
	stdout = new EventEmitter();
	stderr = new EventEmitter();
	kill = vi.fn();
}

/** Returns a mock OpenCode SDK client whose methods resolve with empty data. */
function createMockClient() {
	return {
		session: {
			list: vi.fn().mockResolvedValue({ data: [] }),
			status: vi.fn().mockResolvedValue({ data: {} }),
			get: vi.fn().mockResolvedValue({ data: null }),
			messages: vi.fn().mockResolvedValue({ data: [] })
		},
		vcs: {
			get: vi.fn().mockResolvedValue({ data: { branch: 'main' } })
		}
	};
}

/**
 * Configure mockSpawn to return a MockProc that emits the server-ready
 * message on the next tick (after ensureServer has attached its listeners).
 */
function spawnEmitsUrl(url = 'http://127.0.0.1:12345'): MockProc {
	const proc = new MockProc();
	mockSpawn.mockReturnValue(proc);
	process.nextTick(() => {
		proc.stdout.emit('data', Buffer.from(`opencode server listening on ${url}\n`));
	});
	return proc;
}

// -- Setup / teardown --

beforeEach(() => {
	mockSpawn.mockReset();
	mockCreateOpencodeClient.mockReset();
	mockCreateOpencodeClient.mockReturnValue(createMockClient());
});

afterEach(() => {
	vi.useRealTimers();
	closeOpenCodeServers();
});

// -- Tests --

describe('opencode server lifecycle', () => {
	describe('server startup', () => {
		it('spawns opencode with shell:true and correct arguments', async () => {
			spawnEmitsUrl();
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/test/repo'], 10);

			expect(mockSpawn).toHaveBeenCalledOnce();
			expect(mockSpawn).toHaveBeenCalledWith(
				'opencode',
				['serve', '--hostname=127.0.0.1', '--port=0'],
				expect.objectContaining({
					shell: true,
					env: expect.objectContaining({
						OPENCODE_CONFIG_CONTENT: JSON.stringify({})
					})
				})
			);
		});

		it('passes the parsed server URL to createOpencodeClient', async () => {
			spawnEmitsUrl('http://127.0.0.1:54321');
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/test/repo'], 10);

			expect(mockCreateOpencodeClient).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: 'http://127.0.0.1:54321',
					directory: '/test/repo'
				})
			);
		});

		it('reuses the server across sequential loadRepos calls', async () => {
			spawnEmitsUrl();
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/repo/a'], 10);
			await agent.loadRepos(['/repo/b'], 10);

			expect(mockSpawn).toHaveBeenCalledOnce();
		});

		it('creates separate clients for different directories', async () => {
			spawnEmitsUrl();
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/repo/a'], 10);
			await agent.loadRepos(['/repo/b'], 10);

			expect(mockCreateOpencodeClient).toHaveBeenCalledTimes(2);
			expect(mockCreateOpencodeClient).toHaveBeenCalledWith(
				expect.objectContaining({ directory: '/repo/a' })
			);
			expect(mockCreateOpencodeClient).toHaveBeenCalledWith(
				expect.objectContaining({ directory: '/repo/b' })
			);
		});

		it('reuses the client for the same directory', async () => {
			spawnEmitsUrl();
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/repo/a'], 10);
			await agent.loadRepos(['/repo/a'], 10);

			expect(mockCreateOpencodeClient).toHaveBeenCalledOnce();
		});
	});

	describe('server startup errors', () => {
		it('rejects when spawn emits an error', async () => {
			const proc = new MockProc();
			mockSpawn.mockReturnValue(proc);
			process.nextTick(() => {
				proc.emit('error', new Error('spawn opencode ENOENT'));
			});

			const agent = new OpenCodeAgent();
			await expect(agent.loadRepos(['/test/repo'], 10)).rejects.toThrow(
				'spawn opencode ENOENT'
			);
		});

		it('rejects when the server process exits before emitting a URL', async () => {
			const proc = new MockProc();
			mockSpawn.mockReturnValue(proc);
			process.nextTick(() => {
				proc.emit('exit', 1);
			});

			const agent = new OpenCodeAgent();
			await expect(agent.loadRepos(['/test/repo'], 10)).rejects.toThrow(
				'exited with code 1'
			);
		});

		it('includes captured output in the exit error message', async () => {
			const proc = new MockProc();
			mockSpawn.mockReturnValue(proc);
			process.nextTick(() => {
				proc.stderr.emit('data', Buffer.from('fatal: config error'));
				process.nextTick(() => proc.emit('exit', 1));
			});

			const agent = new OpenCodeAgent();
			await expect(agent.loadRepos(['/test/repo'], 10)).rejects.toThrow(
				'fatal: config error'
			);
		});

		it('rejects when the server URL cannot be parsed from output', async () => {
			const proc = new MockProc();
			mockSpawn.mockReturnValue(proc);
			process.nextTick(() => {
				proc.stdout.emit(
					'data',
					Buffer.from('opencode server listening\n')
				);
			});

			const agent = new OpenCodeAgent();
			await expect(agent.loadRepos(['/test/repo'], 10)).rejects.toThrow(
				'Failed to parse server url'
			);
		});

		it('rejects on timeout when the server never reports its URL', async () => {
			vi.useFakeTimers();
			const proc = new MockProc();
			mockSpawn.mockReturnValue(proc);

			const agent = new OpenCodeAgent();
			const promise = agent.loadRepos(['/test/repo'], 10);

			// Attach the rejection handler before advancing timers so
			// the rejection is never momentarily unhandled.
			const assertion = expect(promise).rejects.toThrow('Timeout');
			await vi.advanceTimersByTimeAsync(5000);
			await assertion;
		});
	});

	describe('closeOpenCodeServers', () => {
		it('kills the server process', async () => {
			const proc = spawnEmitsUrl();
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/test/repo'], 10);

			closeOpenCodeServers();

			expect(proc.kill).toHaveBeenCalledOnce();
		});

		it('is safe to call when no server is running', () => {
			closeOpenCodeServers();
			expect(mockSpawn).not.toHaveBeenCalled();
		});

		it('allows a new server to be spawned after close', async () => {
			spawnEmitsUrl('http://127.0.0.1:11111');
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/test/repo'], 10);

			closeOpenCodeServers();

			spawnEmitsUrl('http://127.0.0.1:22222');
			await agent.loadRepos(['/test/repo'], 10);

			expect(mockSpawn).toHaveBeenCalledTimes(2);
		});

		it('clears the client cache so new clients are created for the same directory', async () => {
			spawnEmitsUrl('http://127.0.0.1:11111');
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/test/repo'], 10);

			closeOpenCodeServers();

			spawnEmitsUrl('http://127.0.0.1:22222');
			await agent.loadRepos(['/test/repo'], 10);

			expect(mockCreateOpencodeClient).toHaveBeenCalledTimes(2);
		});

		it('passes the new server URL to clients after restart', async () => {
			spawnEmitsUrl('http://127.0.0.1:11111');
			const agent = new OpenCodeAgent();
			await agent.loadRepos(['/test/repo'], 10);

			closeOpenCodeServers();

			spawnEmitsUrl('http://127.0.0.1:22222');
			await agent.loadRepos(['/test/repo'], 10);

			const secondCall = mockCreateOpencodeClient.mock.calls[1];
			expect(secondCall[0]).toEqual(
				expect.objectContaining({ baseUrl: 'http://127.0.0.1:22222' })
			);
		});
	});
});
