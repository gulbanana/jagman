import { query } from '$app/server';
import { mockAttentionCards } from '$lib/server/mock-data';
import { loadRepos } from '$lib/server/sessions';

export const getRepos = query(async () => {
	return loadRepos();
});

export const getAttentionCards = query(async () => {
	return mockAttentionCards;
});
