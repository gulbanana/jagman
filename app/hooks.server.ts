import { closeOpenCodeServers } from '$lib/server/opencode';

function shutdown() {
	closeOpenCodeServers();
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
