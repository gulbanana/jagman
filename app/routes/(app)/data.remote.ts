import { query } from '$app/server';
import { mockAttentionCards } from '$lib/server/mock-data';
import { getAllRepos } from '$lib/server/agent';

export const getRepos = query(async () => {
	return getAllRepos();
});

export const getAttentionCards = query(async () => {
	return mockAttentionCards;
});
