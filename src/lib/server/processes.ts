import { exec, execFile } from 'node:child_process';
import { readdir, readFile, readlink } from 'node:fs/promises';
import { basename, normalize } from 'node:path';
import { platform } from 'node:os';
import type { AgentRepoSession } from './agent';

export type AgentProcess = {
	name: string;
	pid: number;
	cwd: string;
	commandLine: string;
};

const AGENT_NAMES = ['claude', 'opencode'];

let cache: { timestamp: number; result: AgentProcess[] } | null = null;
const CACHE_TTL = 5000;

export async function getAgentProcesses(): Promise<AgentProcess[]> {
	if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
		return cache.result;
	}

	let result: AgentProcess[];
	try {
		switch (platform()) {
			case 'win32':
				result = await getWindowsProcesses();
				break;
			case 'linux':
				result = await getLinuxProcesses();
				break;
			case 'darwin':
				result = await getDarwinProcesses();
				break;
			default:
				result = [];
		}
	} catch {
		result = [];
	}

	cache = { timestamp: Date.now(), result };
	return result;
}

/**
 * Collect the set of workspace paths (lowercased) where a given agent
 * binary is currently running.
 */
export function getWorkspacesWithAgent(
	processes: AgentProcess[],
	agentName: string,
	excludeCommandPattern?: RegExp
): Set<string> {
	const workspaces = new Set<string>();
	for (const proc of processes) {
		if (proc.name !== agentName) continue;
		if (excludeCommandPattern && excludeCommandPattern.test(proc.commandLine)) continue;
		if (proc.cwd) {
			workspaces.add(proc.cwd.toLowerCase());
		}
	}
	return workspaces;
}

/**
 * For each workspace that has a running agent process, mark the most
 * recent inactive session as "external". Sessions are grouped by their
 * workspace field (case-insensitive) so that future workspace splits
 * are handled correctly.
 */
export function markExternalSessions(
	sessions: AgentRepoSession[],
	activeWorkspaces: Set<string>
): void {
	const byWorkspace = new Map<string, AgentRepoSession[]>();
	for (const session of sessions) {
		const key = session.workspace.toLowerCase();
		let list = byWorkspace.get(key);
		if (!list) {
			list = [];
			byWorkspace.set(key, list);
		}
		list.push(session);
	}

	for (const [workspace, workspaceSessions] of byWorkspace) {
		if (!activeWorkspaces.has(workspace)) continue;

		let mostRecent: AgentRepoSession | null = null;
		for (const s of workspaceSessions) {
			if (s.status !== 'inactive') continue;
			if (!mostRecent || s.timestamp > mostRecent.timestamp) {
				mostRecent = s;
			}
		}

		if (mostRecent) {
			mostRecent.status = 'external';
		}
	}
}

// ---------------------------------------------------------------------------
// Platform-specific implementations
// ---------------------------------------------------------------------------

function execAsync(command: string, timeout = 10000): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(command, { timeout }, (error, stdout) => {
			if (error) return reject(error);
			resolve(stdout);
		});
	});
}

// -- Windows ----------------------------------------------------------------

/**
 * PowerShell script that enumerates claude.exe / opencode.exe processes
 * and reads each process's current working directory via the PEB
 * (Process Environment Block). Uses Add-Type to compile a small C#
 * helper that calls NtQueryInformationProcess + ReadProcessMemory.
 */
const PS_SCRIPT = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class JagmanProcCwd {
    [DllImport("ntdll.dll")]
    static extern int NtQueryInformationProcess(IntPtr h, int c, ref PBI p, int s, out int r);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern IntPtr OpenProcess(int a, bool b, int pid);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, int sz, out int read);
    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr h);

    [StructLayout(LayoutKind.Sequential)]
    struct PBI { public IntPtr R1, Peb, R2a, R2b, Pid, R3; }

    public static string Get(int pid) {
        IntPtr h = OpenProcess(0x0410, false, pid);
        if (h == IntPtr.Zero) return null;
        try {
            var pbi = new PBI(); int rl;
            if (NtQueryInformationProcess(h, 0, ref pbi, Marshal.SizeOf(pbi), out rl) != 0) return null;
            byte[] b = new byte[8]; int br;
            if (!ReadProcessMemory(h, pbi.Peb + 0x20, b, 8, out br)) return null;
            IntPtr pp = (IntPtr)BitConverter.ToInt64(b, 0);
            byte[] us = new byte[16];
            if (!ReadProcessMemory(h, pp + 0x38, us, 16, out br)) return null;
            short len = BitConverter.ToInt16(us, 0);
            IntPtr bp = (IntPtr)BitConverter.ToInt64(us, 8);
            byte[] pb = new byte[len];
            if (!ReadProcessMemory(h, bp, pb, len, out br)) return null;
            return System.Text.Encoding.Unicode.GetString(pb).TrimEnd(new char[]{(char)92});
        } finally { CloseHandle(h); }
    }
}
'@ -ErrorAction SilentlyContinue

Get-CimInstance Win32_Process -Filter "Name='claude.exe' OR Name='opencode.exe'" | ForEach-Object {
    $cwd = [JagmanProcCwd]::Get($_.ProcessId)
    [PSCustomObject]@{ name=$_.Name; pid=[int]$_.ProcessId; cwd=$cwd; cmd=$_.CommandLine }
} | ConvertTo-Json -Compress
`;

async function getWindowsProcesses(): Promise<AgentProcess[]> {
	const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');

	return new Promise((resolve) => {
		execFile(
			'powershell.exe',
			['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
			{ timeout: 15000 },
			(error, stdout) => {
				if (error) {
					resolve([]);
					return;
				}
				try {
					const trimmed = stdout.trim();
					if (!trimmed) {
						resolve([]);
						return;
					}
					const raw = JSON.parse(trimmed);
					const items: { name: string; pid: number; cwd: string | null; cmd: string }[] =
						Array.isArray(raw) ? raw : [raw];
					resolve(
						items
							.filter((item) => item.cwd)
							.map((item) => ({
								name: item.name.replace(/\.exe$/i, '').toLowerCase(),
								pid: item.pid,
								cwd: normalize(item.cwd!),
								commandLine: item.cmd || ''
							}))
					);
				} catch {
					resolve([]);
				}
			}
		);
	});
}

// -- Linux ------------------------------------------------------------------

async function getLinuxProcesses(): Promise<AgentProcess[]> {
	const results: AgentProcess[] = [];

	let entries: string[];
	try {
		entries = await readdir('/proc');
	} catch {
		return results;
	}

	await Promise.allSettled(
		entries.map(async (entry) => {
			const pid = parseInt(entry);
			if (isNaN(pid)) return;

			const comm = (await readFile(`/proc/${pid}/comm`, 'utf8')).trim();
			if (!AGENT_NAMES.includes(comm)) return;

			const cwd = await readlink(`/proc/${pid}/cwd`);
			const cmdline = (await readFile(`/proc/${pid}/cmdline`, 'utf8'))
				.replace(/\0/g, ' ')
				.trim();

			results.push({ name: comm, pid, cwd, commandLine: cmdline });
		})
	);

	return results;
}

// -- macOS ------------------------------------------------------------------

async function getDarwinProcesses(): Promise<AgentProcess[]> {
	const results: AgentProcess[] = [];

	// Find agent PIDs and their command lines
	const psOutput = await execAsync('ps -axo pid=,comm=,args=');
	const agentPids: { pid: number; name: string; commandLine: string }[] = [];

	for (const line of psOutput.split('\n')) {
		const match = line.trim().match(/^\s*(\d+)\s+(\S+)\s+(.*)$/);
		if (!match) continue;
		const pid = parseInt(match[1]);
		const name = basename(match[2]).toLowerCase();
		const commandLine = match[3];
		if (AGENT_NAMES.includes(name)) {
			agentPids.push({ pid, name, commandLine });
		}
	}

	if (agentPids.length === 0) return results;

	// Batch-fetch CWDs via lsof
	const pids = agentPids.map((p) => p.pid).join(',');
	let lsofOutput: string;
	try {
		lsofOutput = await execAsync(`lsof -d cwd -Fn -p ${pids} 2>/dev/null`);
	} catch {
		lsofOutput = '';
	}

	const cwdMap = new Map<number, string>();
	let currentPid = 0;
	for (const line of lsofOutput.split('\n')) {
		if (line.startsWith('p')) {
			currentPid = parseInt(line.slice(1));
		} else if (line.startsWith('n') && currentPid) {
			cwdMap.set(currentPid, line.slice(1));
		}
	}

	for (const { pid, name, commandLine } of agentPids) {
		const cwd = cwdMap.get(pid) ?? '';
		if (cwd) {
			results.push({ name, pid, cwd, commandLine });
		}
	}

	return results;
}
