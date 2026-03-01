import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		// Keep the native NAPI-RS module external from the SSR bundle.
		// Without this, Vite inlines the loader and its createRequire(import.meta.url)
		// resolves the .node file relative to the wrong directory.
		// See AGENTS.md "Bundler Externalisation" for the full explanation.
		{
			name: 'externalize-libgg',
			enforce: 'pre',
			apply: 'build',
			resolveId(source) {
				if (source === 'libgg') {
					return { id: 'libgg', external: true };
				}
			}
		}
	],
	ssr: {
		external: ['libgg']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['app/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['app/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['app/**/*.{test,spec}.{js,ts}'],
					exclude: ['app/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
