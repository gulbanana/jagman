#!/usr/bin/env node

process.noDeprecation = true;

import http from 'node:http';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || '0';

const entry = new URL('../build/handler.js', import.meta.url);
const { handler } = await import(entry.href);

const server = http.createServer(handler);

const actualPort = await new Promise((resolve) => {
	server.listen({ host, port }, () => {
		resolve(server.address().port);
	});
});

const url = `http://${host}:${actualPort}`;
console.log(`JAGMAN listening on ${url}`);

const [cmd, ...args] =
	platform() === 'win32' ? ['cmd', '/c', 'start', '', url] :
		platform() === 'darwin' ? ['open', url] :
			['xdg-open', url];

spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
