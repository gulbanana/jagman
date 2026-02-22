// Native GG bindings — server-only
// NAPI-RS generates index.js (ESM) and index.d.ts at the project root
import {
	startGgWeb as nativeStartGgWeb,
	stopGgWeb as nativeStopGgWeb,
	stopAllGgWeb as nativeStopAllGgWeb,
} from '../../../index.js';
import { homedir } from 'node:os';

const HOME = homedir();

/** Reverse the display-path tilde convention back to a filesystem path. */
function fromDisplayPath(displayPath: string): string {
	if (displayPath.startsWith('~')) {
		return HOME + displayPath.slice(1);
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
