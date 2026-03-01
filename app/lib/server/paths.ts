import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import envPaths from 'env-paths';

const paths = envPaths('jagman', { suffix: '' });

export const JAGMAN_CONFIG_DIR = paths.config;
export const JAGMAN_DB_PATH = join(JAGMAN_CONFIG_DIR, 'db.etilqs');
export const JAGMAN_WORKSPACES_DIR = join(JAGMAN_CONFIG_DIR, 'workspaces');

export function ensureJagmanConfigDir(): void {
	mkdirSync(JAGMAN_CONFIG_DIR, { recursive: true });
}
