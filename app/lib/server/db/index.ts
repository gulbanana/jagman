import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { ensureJagmanConfigDir, JAGMAN_DB_PATH } from '$lib/server/paths';

ensureJagmanConfigDir();

export const client = new Database(JAGMAN_DB_PATH);

export const db = drizzle(client, { schema });
