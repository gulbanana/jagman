// Native GG bindings — server-only
// NAPI-RS generates index.js (ESM) and index.d.ts at the project root.
// Imported via the 'libgg' wrapper package (native/) so that both Vite and
// adapter-node externalise it, keeping the NAPI-RS loader's import.meta.url
// pointing at the package root where the .node file lives.
import {
	startGgWeb as nativeStartGgWeb,
	stopGgWeb as nativeStopGgWeb,
	stopAllGgWeb as nativeStopAllGgWeb,
	createWorkspace as nativeCreateWorkspace,
	removeWorkspace as nativeRemoveWorkspace,
} from 'libgg';
import { homedir } from 'node:os';
import { join, normalize } from 'node:path';
import { initService, pushActivity } from '$lib/server/state';
import { JAGMAN_WORKSPACES_DIR } from '$lib/server/paths';

const HOME = homedir();

/** Reverse the display-path tilde convention back to a filesystem path. */
function fromDisplayPath(displayPath: string): string {
	if (displayPath.startsWith('~')) {
		return normalize(HOME + displayPath.slice(1));
	}
	return displayPath;
}

/** Start (or reuse) a GG web server for a repo, returning the full URL. */
export async function startGgWeb(displayPath: string): Promise<string> {
	const fsPath = fromDisplayPath(displayPath);
	const port = await nativeStartGgWeb(fsPath);
	return `http://localhost:${port}/log`;
}

/** Stop the GG web server for a specific repo. */
export function stopGgWeb(displayPath: string): void {
	const fsPath = fromDisplayPath(displayPath);
	nativeStopGgWeb(fsPath);
}

/** Stop all GG web server instances, optionally keeping one alive. */
export function stopAllGgWeb(exceptDisplayPath: string | null): void {
	const exceptFsPath = exceptDisplayPath !== null ? fromDisplayPath(exceptDisplayPath) : undefined;
	nativeStopAllGgWeb(exceptFsPath);
}

// --- Workspace management ---

/** Create a jj workspace for an agent session. Returns the workspace name (UUID). */
export async function createAgentWorkspace(repoDisplayPath: string): Promise<string> {
	const repoFsPath = fromDisplayPath(repoDisplayPath);
	const workspaceName = crypto.randomUUID();
	const workspacePath = normalize(join(JAGMAN_WORKSPACES_DIR, workspaceName));
	await nativeCreateWorkspace(repoFsPath, workspaceName, workspacePath);
	return workspaceName;
}

/** Remove (forget) a jj workspace. */
export async function removeAgentWorkspace(repoDisplayPath: string, workspaceName: string): Promise<void> {
	const workspacePath = normalize(join(JAGMAN_WORKSPACES_DIR, workspaceName));
	const repoFsPath = fromDisplayPath(repoDisplayPath);
	await nativeRemoveWorkspace(repoFsPath, workspacePath, workspaceName);
}

initService('gg web', () => ({}), () => stopAllGgWeb(null));
