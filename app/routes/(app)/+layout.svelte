<script lang="ts">
	import RightSidebar from "./RightSidebar.svelte";
	import LeftSidebar from "./LeftSidebar.svelte";

	let { children } = $props();
</script>

<div class="layout">
	<div class="left">
		<LeftSidebar />
	</div>

	<div class="center">
		{@render children()}
	</div>

	<div class="right">
		<RightSidebar />
	</div>
</div>

<style>
	.layout {
		min-width: 1366px;
		min-height: 768px;
		height: 100dvh;

		display: grid;
		grid-template-columns: 128px 1fr 128px;
		overflow: hidden;
	}

	.left,
	.right {
		background: var(--ctp-mantle);
		border-color: var(--ctp-overlay0);
		border-style: solid;
		padding: 16px 8px 0 8px;
	}

	.left {
		border-width: 2px 2px 2px 0;
		border-radius: 0 32px 32px 0;
	}

	.right {
		border-width: 2px 0 2px 2px;
		border-radius: 32px 0 0 32px;
	}

	.center {
		padding: 32px;

		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	@media (max-width: 1919px) {
		.center {
			padding: 16px;
		}
	}
</style>
