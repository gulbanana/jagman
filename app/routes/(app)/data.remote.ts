import { query } from '$app/server';
import { mockAttentionCards } from '$lib/server/mock-data';
import { getRepoStubs as getRepoStubsServer, getRepoSummary as getRepoSummaryServer } from '$lib/server/agent';
import { getActivity as getActivityEntries } from '$lib/server/state';

export const getRepoStubs = query(async () => {
	return getRepoStubsServer();
});

export const getRepoSummary = query('unchecked', async (path: string) => {
	return getRepoSummaryServer(path);
});

export const getAttentionCards = query(async () => {
	return mockAttentionCards;
});

export const getActivity = query(async () => {
	return getActivityEntries();
});
