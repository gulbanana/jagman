import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { ensureJagmanConfigDir, JAGMAN_DB_PATH } from '$lib/server/paths';
import { onShutdown, pushActivity } from '$lib/server/state';

ensureJagmanConfigDir();

export const client = new Database(JAGMAN_DB_PATH);
onShutdown('db', () => { client.close(); }, { late: true });
pushActivity({ source: 'jg', event: 'startup', detail: 'Database opened', timestamp: Date.now() });

export const db = drizzle(client, { schema });
