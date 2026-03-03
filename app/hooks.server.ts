import { shutdown } from '$lib/server/state';

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
