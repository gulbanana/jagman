<script lang="ts">
	import type { AgentBrand } from "$lib/brands";
	import type { RepoStub } from "$lib/messages";
	import { getRepoSummary as getRepoSummary } from "./data.remote";
	import RepoCard from "./RepoCard.svelte";
	import AgentCard from "./AgentCard.svelte";

	let {
		stub,
		selectedAgentId,
		onselectrepo,
		onselectagent,
	}: {
		stub: RepoStub;
		selectedAgentId: string | null;
		onselectrepo: () => void;
		onselectagent: (brand: AgentBrand, id: string, title: string) => void;
	} = $props();

	const repo = $derived(await getRepoSummary(stub.path));
</script>

<RepoCard displayPath={stub.displayPath} {repo} onclick={onselectrepo} />
{#each repo.sessions as session (session.id)}
	<AgentCard
		{session}
		selected={selectedAgentId === session.id}
		onclick={() =>
			onselectagent(session.brand, session.id, session.title)} />
{/each}
