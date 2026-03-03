import { shutdown } from '$lib/server/state';

// on Windows, this will only work for ctrl-c - fine for now
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
