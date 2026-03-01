import { asc, eq } from 'drizzle-orm';
import { isAbsolute } from 'node:path';
import { client, db } from './index';
import { repository } from './schema';

export type RepositoryRecord = {
	id: number;
	path: string;
};

const REQUIRED_TABLES = ['repository', 'workspace'] as const;

function readTableNames(): Set<string> {
	const rows = client
		.prepare(
			`SELECT name
			 FROM sqlite_master
			 WHERE type = 'table'`
		)
		.all() as { name: string }[];
	return new Set(rows.map((row) => row.name));
}

function normalizeRepositoryPath(path: string): string {
	return path.trim();
}

function normalizeForCompare(path: string): string {
	return path.toLowerCase();
}

export function getDatabaseStatus(): {
	migrated: boolean;
	missingTables: string[];
} {
	const tables = readTableNames();
	const missingTables = REQUIRED_TABLES.filter((name) => !tables.has(name));
	return {
		migrated: missingTables.length === 0,
		missingTables
	};
}

export function listRepositories(): RepositoryRecord[] {
	if (!getDatabaseStatus().migrated) return [];
	return db
		.select({
			id: repository.id,
			path: repository.path
		})
		.from(repository)
		.orderBy(asc(repository.path))
		.all();
}

export function addRepository(path: string): void {
	const { migrated } = getDatabaseStatus();
	if (!migrated) {
		throw new Error('Database is not migrated.');
	}

	const normalized = normalizeRepositoryPath(path);
	if (!normalized) {
		throw new Error('Repository path is required.');
	}
	if (!isAbsolute(normalized)) {
		throw new Error('Repository path must be absolute.');
	}

	const existing = listRepositories().find(
		(repo) => normalizeForCompare(repo.path) === normalizeForCompare(normalized)
	);
	if (existing) {
		throw new Error('Repository path already exists.');
	}

	db.insert(repository).values({ path: normalized }).run();
}

export function removeRepository(id: number): void {
	const { migrated } = getDatabaseStatus();
	if (!migrated) {
		throw new Error('Database is not migrated.');
	}

	db.delete(repository).where(eq(repository.id, id)).run();
}

export function resetDatabase(): void {
	const tables = [...readTableNames()].filter((name) => !name.startsWith('sqlite_'));

	client.exec('PRAGMA foreign_keys = OFF;');
	try {
		for (const table of tables) {
			const escaped = table.replaceAll('"', '""');
			client.exec(`DROP TABLE IF EXISTS "${escaped}";`);
		}
	} finally {
		client.exec('PRAGMA foreign_keys = ON;');
	}
}
