import { query } from '$app/server';
import { mockRepos, mockCommits } from '$lib/server/mock-data';
import type { Repo, Commit } from '$lib/types';

export const getRepoDetail = query('unchecked', async (path: string): Promise<{ repo: Repo; commits: Commit[] } | null> => {
	const repo = mockRepos.find(r => r.path === path);
	if (!repo) return null;
	return { repo, commits: mockCommits };
});
