import { defineConfig } from 'drizzle-kit';
import { ensureJagmanConfigDir, JAGMAN_DB_PATH } from './app/lib/server/paths';

ensureJagmanConfigDir();

export default defineConfig({
	schema: './app/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: JAGMAN_DB_PATH },
	verbose: true,
	strict: true
});
