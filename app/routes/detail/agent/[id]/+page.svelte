<script lang="ts">
	import { page } from "$app/state";
	import { getAgentDetail } from "./data.remote";
	import ErrorSpan from "$lib/ErrorSpan.svelte";
	import LogView from "$lib/LogView.svelte";

	const agentQuery = getAgentDetail(page.params.id ?? "");
	const agent = $derived(agentQuery.current);

	let wrapperEl = $state<HTMLDivElement>();

	$effect(() => {
		if (agent && agent.log.length > 0 && wrapperEl) {
			const logEl = wrapperEl.firstElementChild;
			if (logEl) {
				logEl.lastElementChild?.scrollIntoView();
			}
		}
	});
</script>

{#if agentQuery.error}
	<div class="status">
		<ErrorSpan
			>{agentQuery.error.message ??
				"Failed to load agent session."}</ErrorSpan>
	</div>
{:else if agentQuery.loading}
	<div class="status">Loading...</div>
{:else if agent}
	<svelte:boundary>
		<div bind:this={wrapperEl}>
			<LogView log={agent.log} />
		</div>
		{#snippet failed(error)}
			<div class="status">
				<ErrorSpan>
					Render error: {error instanceof Error
						? error.message
						: error}
				</ErrorSpan>
			</div>
		{/snippet}
	</svelte:boundary>
{:else}
	<div class="status">Loading...</div>
{/if}

<style>
	.status {
		color: var(--ctp-subtext0);
		font-family: var(--stack-ui);
	}
</style>
