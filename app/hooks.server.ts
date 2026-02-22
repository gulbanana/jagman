import { stopAllGgWeb } from '$lib/server/gg';
import { closeOpenCodeServers } from '$lib/server/opencode';

function shutdown() {
	stopAllGgWeb(null);
	closeOpenCodeServers();
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
