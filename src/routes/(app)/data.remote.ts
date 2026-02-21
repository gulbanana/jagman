import { query } from '$app/server';
import { mockRepos } from '$lib/server/mock-data';

export const getRepos = query(async () => {
	return mockRepos;
});
