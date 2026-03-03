import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { ensureJagmanConfigDir, JAGMAN_DB_PATH } from '$lib/server/paths';
import { initService } from '$lib/server/state';

const svc = initService('sqlite', () => {
	ensureJagmanConfigDir();
	const client = new Database(JAGMAN_DB_PATH);
	return { client, db: drizzle(client, { schema }) };
}, (s) => { s.client.close(); }, { late: true });

export const client = svc.client;
export const db = svc.db;
