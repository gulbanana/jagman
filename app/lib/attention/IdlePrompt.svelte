<script lang="ts">
	import type { IdlePromptDetail } from "$lib/messages";
	import TextArea from "$lib/TextArea.svelte";
	import ControlButton from "$lib/ControlButton.svelte";

	let { id }: { id: number; detail: IdlePromptDetail } = $props();

	async function submit() {
		await fetch("/attention/" + id, { method: "DELETE" });
	}

	async function done() {
		await fetch("/attention/" + id + "/done", { method: "POST" });
	}
</script>

<TextArea name="idle-prompt" placeholder="Enter a prompt for the agent..." />
<div class="actions">
	<ControlButton onclick={done}>Done</ControlButton>
	<ControlButton intent="confirm" onclick={submit}>Send</ControlButton>
</div>

<style>
	.actions {
		display: flex;
		justify-content: end;
		gap: 8px;
		margin-top: 8px;
	}
</style>
