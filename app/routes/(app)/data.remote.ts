import { query } from '$app/server';
import { getRepoStubs as getRepoStubsServer, getRepoSummary as getRepoSummaryServer } from '$lib/server/agent';
import { getActivity as getActivityEntries, getAttention as getAttentionServer } from '$lib/server/state';

export const getRepoStubs = query(async () => {
	return getRepoStubsServer();
});

export const getRepoSummary = query('unchecked', async (path: string) => {
	return getRepoSummaryServer(path);
});

export const getAttentionItems = query(async () => {
	return getAttentionServer();
});

export const getActivity = query(async () => {
	return getActivityEntries();
});
