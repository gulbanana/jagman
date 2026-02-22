import { describe, it, expect } from 'vitest';
import { createRunOptions } from './gg';

describe('libgg native bindings', () => {
	it('should create RunOptions and return workspace info', () => {
		expect(createRunOptions).toBeDefined();
		const info = createRunOptions('.');
		expect(info).toHaveProperty('path');
		expect(info).toHaveProperty('settingsLoaded');
		expect(info.settingsLoaded).toBe(true);
	});
});
