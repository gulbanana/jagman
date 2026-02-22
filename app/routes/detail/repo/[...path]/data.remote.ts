import { query } from '$app/server';
import { getAllRepos } from '$lib/server/agent';
import { mockCommits } from '$lib/server/mock-data';
import type { Repo, Commit } from '$lib/messages';

export const getRepoDetail = query('unchecked', async (path: string): Promise<{ repo: Repo; commits: Commit[] } | null> => {
	const repos = await getAllRepos();
	const repo = repos.find(r => r.path === path);
	if (!repo) return null;
	return { repo, commits: mockCommits };
});
