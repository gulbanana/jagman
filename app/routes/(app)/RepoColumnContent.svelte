<script lang="ts">
	import type { AgentBrand } from "$lib/brands";
	import type { RepoActivitySignal } from "$lib/activity";
	import type { RepoStub } from "$lib/messages";
	import { getRepoSummary as getRepoSummary } from "./data.remote";
	import RepoCard from "./RepoCard.svelte";
	import AgentCard from "./AgentCard.svelte";

	let {
		stub,
		selectedAgentId,
		onloaded,
		onselectrepo,
		onselectagent,
	}: {
		stub: RepoStub;
		selectedAgentId: string | null;
		onloaded: (signal: RepoActivitySignal) => void;
		onselectrepo: () => void;
		onselectagent: (brand: AgentBrand, id: string, title: string) => void;
	} = $props();

	const repo = $derived(await getRepoSummary(stub.path));

	$effect(() => {
		onloaded({
			path: stub.path,
			active: repo.sessions.some(
				(s) => s.status === 'running' || s.status === 'waiting' || s.status === 'external'
			),
			timestamp: repo.sessions[0]?.timestamp ?? 0,
		});
	});
</script>

<RepoCard displayPath={stub.displayPath} {repo} onclick={onselectrepo} />
{#each repo.sessions as session (session.id)}
	<AgentCard
		{session}
		selected={selectedAgentId === session.id}
		onclick={() =>
			onselectagent(session.brand, session.id, session.title)} />
{/each}
