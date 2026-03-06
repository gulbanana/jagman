<script lang="ts">
	import type { LaunchPromptDetail } from "$lib/messages";
	import TextArea from "$lib/TextArea.svelte";
	import ControlButton from "$lib/ControlButton.svelte";

	let { id }: { id: number; detail: LaunchPromptDetail } = $props();

	async function submit() {
		await fetch("/attention/" + id + "/launch", { method: "POST" });
	}
</script>

<TextArea name="launch-prompt" placeholder="Enter a prompt for the new agent..." />
<div class="actions">
	<ControlButton intent="confirm" onclick={submit}>Launch</ControlButton>
</div>

<style>
	.actions {
		display: flex;
		justify-content: end;
		gap: 8px;
		margin-top: 8px;
	}
</style>
