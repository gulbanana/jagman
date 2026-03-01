import { describe, it, expect } from 'vitest';
import * as nativeLibgg from 'libgg';
import { startGgWeb, stopGgWeb, stopAllGgWeb } from './gg';

describe('libgg native bindings', () => {
	it('should export GG web server lifecycle functions from both layers', () => {
		expect(nativeLibgg.startGgWeb).toBeDefined();
		expect(nativeLibgg.stopGgWeb).toBeDefined();
		expect(nativeLibgg.stopAllGgWeb).toBeDefined();
		expect(startGgWeb).toBeDefined();
		expect(stopGgWeb).toBeDefined();
		expect(stopAllGgWeb).toBeDefined();
	});
});
