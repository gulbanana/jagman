<script lang="ts">
	import FeatherIcon from "$lib/FeatherIcon.svelte";

	let {
		name,
		onclick,
	}: {
		name: string;
		onclick: () => void;
	} = $props();

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onclick();
	}
</script>

<button class="act-button" onclick={handleClick}>
	<FeatherIcon {name} />
</button>

<style>
	.act-button {
		cursor: pointer;

		display: flex;
		align-items: center;
		justify-content: center;

		/* round */
		padding: 0;
		margin: -4px -4px 0 0;
		width: 24px;
		height: 24px;
		border: 2px solid transparent;
		border-radius: 12px;

		background: var(--ctp-surface1);
		color: var(--ctp-text);
	}

	.act-button:hover {
		border-color: var(--ctp-lavender);
	}

	.act-button:active {
		background-color: var(--ctp-lavender);
		color: var(--ctp-base);
	}
</style>
