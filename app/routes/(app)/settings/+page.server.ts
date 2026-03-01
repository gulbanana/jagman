import { spawn } from 'node:child_process';
import { fail } from '@sveltejs/kit';
import {
	addRepository,
	getDatabaseStatus,
	listRepositories,
	removeRepository,
	resetDatabase
} from '$lib/server/db/repository';
import type { Actions, PageServerLoad } from './$types';

type ActionState = {
	ok: boolean;
	operation: string;
	message: string;
};

function asMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function parseRepositoryId(value: FormDataEntryValue | null): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error('Invalid repository id.');
	}
	return parsed;
}

async function runNpmScript(script: string, args: string[] = []): Promise<void> {
	const commandArgs = ['run', script, ...(args.length > 0 ? ['--', ...args] : [])];

	await new Promise<void>((resolve, reject) => {
		const proc = spawn('npm', commandArgs, {
			cwd: process.cwd(),
			shell: true,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let output = '';
		proc.stdout?.on('data', (chunk: Buffer) => {
			output += chunk.toString();
		});
		proc.stderr?.on('data', (chunk: Buffer) => {
			output += chunk.toString();
		});

		proc.on('error', reject);
		proc.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`npm run ${script} failed with code ${code}\n${output.trim()}`));
		});
	});
}

function ok(operation: string, message: string): ActionState {
	return { ok: true, operation, message };
}

function bad(operation: string, error: unknown) {
	return fail(400, {
		ok: false,
		operation,
		message: asMessage(error)
	} satisfies ActionState);
}

export const load: PageServerLoad = async () => {
	const dbStatus = getDatabaseStatus();
	const repositories = dbStatus.migrated ? listRepositories() : [];

	return {
		dbStatus,
		repositories
	};
};

export const actions: Actions = {
	resetDb: async () => {
		try {
			resetDatabase();
			return ok('reset-db', 'Database reset complete.');
		} catch (error) {
			return bad('reset-db', error);
		}
	},

	dbPush: async () => {
		try {
			await runNpmScript('db:push', ['--force']);
			return ok('db-push', 'Drizzle push complete.');
		} catch (error) {
			return bad('db-push', error);
		}
	},

	dbGenerate: async () => {
		try {
			await runNpmScript('db:generate');
			return ok('db-generate', 'Drizzle generate complete.');
		} catch (error) {
			return bad('db-generate', error);
		}
	},

	dbMigrate: async () => {
		try {
			await runNpmScript('db:migrate');
			return ok('db-migrate', 'Drizzle migrate complete.');
		} catch (error) {
			return bad('db-migrate', error);
		}
	},

	addRepository: async ({ request }) => {
		const formData = await request.formData();
		const path = String(formData.get('path') ?? '');

		try {
			addRepository(path);
			return ok('add-repository', 'Repository added.');
		} catch (error) {
			return bad('add-repository', error);
		}
	},

	removeRepository: async ({ request }) => {
		const formData = await request.formData();

		try {
			const id = parseRepositoryId(formData.get('id'));
			removeRepository(id);
			return ok('remove-repository', 'Repository removed.');
		} catch (error) {
			return bad('remove-repository', error);
		}
	}
};
