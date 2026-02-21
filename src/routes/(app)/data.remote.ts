import { query } from '$app/server';
import { mockRepos, mockAttentionCards } from '$lib/server/mock-data';

export const getRepos = query(async () => {
	return mockRepos;
});

export const getAttentionCards = query(async () => {
	return mockAttentionCards;
});
