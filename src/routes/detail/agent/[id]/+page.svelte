<script lang="ts">
	import { page } from "$app/state";
	import { getAgentDetail } from "./data.remote";

	const agentQuery = getAgentDetail(page.params.id ?? "");
	const agent = $derived(agentQuery.current);
</script>

{#if agentQuery.error}
	<p class="status">Agent not found.</p>
{:else if agentQuery.loading}
	<p class="status">Loading...</p>
{:else if agent}
	<div class="log">
		{#each agent.log as line, i (i)}
			<div class="log-line">{line}</div>
		{/each}
	</div>
{/if}

<style>
	.status {
		padding: 32px;
		color: var(--ctp-subtext0);
		font-family: var(--stack-ui);
	}

	.log {
		font-family: var(--stack-code);
		font-size: 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	.log-line {
		color: var(--ctp-subtext1);
		padding: 1px 4px;
	}
</style>
