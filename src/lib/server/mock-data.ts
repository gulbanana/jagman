import type { Repo, Commit } from '$lib/types';

export const mockRepos: Repo[] = [
	{
		path: "~/projects/webapp",
		branch: "main",
		agents: [
			{
				id: "a1",
				name: "claude-1",
				status: "running",
				mode: "standard",
				detail: "refactoring auth module",
				log: [
					"[14:32:01] Reading src/auth/login.ts",
					"[14:32:03] Reading src/auth/session.ts",
					"[14:32:05] Editing src/auth/login.ts — extracting validateCredentials()",
					"[14:32:08] Editing src/auth/session.ts — updating imports",
					"[14:32:10] Running npm test",
					"[14:32:15] 42 tests passed, 0 failed",
					"[14:32:16] Editing src/auth/login.ts — adding error handling",
				],
			},
			{
				id: "a2",
				name: "claude-2",
				status: "running",
				mode: "plan",
				detail: "adding search feature",
				log: [
					"[14:28:00] Reading src/components/SearchBar.svelte",
					"[14:28:05] Creating src/lib/search.ts",
					"[14:28:12] Editing src/routes/+page.svelte",
				],
			},
			{
				id: "a3",
				name: "opencode-1",
				status: "waiting",
				mode: "yolo",
				detail: "deleting hard drive",
				log: [
					"[14:25:00] Editing src/lib/api.ts",
					"[14:25:08] Bypassing permission: rm -rf /",
				],
			},
			{
				id: "a4",
				name: "claude-3",
				status: "completed",
				detail: "added dark mode",
				log: ["[13:45:00] Task completed"],
			},
			{
				id: "a5",
				name: "claude-4",
				status: "completed",
				detail: "fixed login redirect bug",
				log: ["[yesterday] Task completed"],
			},
			{
				id: "a6",
				name: "opencode-2",
				status: "completed",
				detail: "updated dependencies",
				log: ["[yesterday] Task completed"],
			},
			{
				id: "a7",
				name: "claude-5",
				status: "completed",
				detail: "refactored API client",
				log: ["[2 days ago] Task completed"],
			},
			{
				id: "a8",
				name: "claude-6",
				status: "completed",
				detail: "added list pagination",
				log: ["[3 days ago] Task completed"],
			},
		],
	},
	{
		path: "~/projects/api-server",
		branch: "develop",
		agents: [
			{
				id: "b1",
				name: "opencode-3",
				status: "waiting",
				mode: "standard",
				detail: "needs permission",
				log: [
					"[14:30:00] Reading src/routes/users.ts",
					"[14:30:05] Editing src/routes/users.ts",
					"[14:30:08] Requesting permission: run npm test",
				],
			},
			{
				id: "b2",
				name: "claude-7",
				status: "completed",
				detail: "added rate limiting",
				log: ["[1 hour ago] Task completed"],
			},
			{
				id: "b3",
				name: "claude-8",
				status: "completed",
				detail: "fixed CORS config",
				log: ["[yesterday] Task completed"],
			},
			{
				id: "b4",
				name: "opencode-4",
				status: "completed",
				detail: "added health check endpoint",
				log: ["[2 days ago] Task completed"],
			},
			{
				id: "b5",
				name: "claude-9",
				status: "completed",
				detail: "wrote migration scripts",
				log: ["[3 days ago] Task completed"],
			},
		],
	},
	{
		path: "~/projects/docs-site",
		branch: "main",
		agents: [
			{
				id: "c1",
				name: "claude-10",
				status: "completed",
				detail: "rewrote getting started guide",
				log: ["[2 days ago] Task completed"],
			},
			{
				id: "c2",
				name: "claude-11",
				status: "completed",
				detail: "added API reference section",
				log: ["[3 days ago] Task completed"],
			},
			{
				id: "c3",
				name: "opencode-5",
				status: "completed",
				detail: "fixed broken links",
				log: ["[4 days ago] Task completed"],
			},
		],
	},
];

export const mockCommits: Commit[] = [
	{ hash: "ksqvpn", author: "you", message: "wip: layout prototyping", age: "2m ago" },
	{ hash: "rmzxtl", author: "claude-1", message: "refactor: extract validateCredentials", age: "5m ago" },
	{ hash: "yonwkp", author: "claude-2", message: "feat: search component scaffold", age: "8m ago" },
	{ hash: "vlmqst", author: "claude-3", message: "feat: dark mode support", age: "1h ago" },
	{ hash: "tpxwrn", author: "you", message: "merge: dark mode into main", age: "1h ago" },
	{ hash: "sqkzml", author: "claude-4", message: "fix: login redirect loop", age: "yesterday" },
	{ hash: "nwprtx", author: "opencode-2", message: "chore: update dependencies", age: "yesterday" },
];
