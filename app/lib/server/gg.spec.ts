import { describe, it, expect } from 'vitest';
import { startGgWeb, stopGgWeb, stopAllGgWeb } from './gg';

describe('libgg native bindings', () => {
	it('should export GG web server lifecycle functions', () => {
		expect(startGgWeb).toBeDefined();
		expect(stopGgWeb).toBeDefined();
		expect(stopAllGgWeb).toBeDefined();
	});
});
