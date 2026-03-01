<script lang="ts">
	import { page } from "$app/state";
	import { getAgentDetail } from "./data.remote";
	import LogView from "$lib/LogView.svelte";

	const agent = $derived(await getAgentDetail(page.params.id ?? ""));

	let wrapperEl = $state<HTMLDivElement>();

	$effect(() => {
		if (agent.log.length > 0 && wrapperEl) {
			const logEl = wrapperEl.firstElementChild;
			if (logEl) {
				logEl.lastElementChild?.scrollIntoView();
			}
		}
	});
</script>

<div bind:this={wrapperEl}>
	<LogView log={agent.log} />
</div>
