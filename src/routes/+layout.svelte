<script lang="ts">
	import "$lib/theme.css";
	import favicon from "$lib/assets/favicon.svg";
	import Logo from "$lib/Logo.svelte";
	import RightSidebar from "$lib/RightSidebar.svelte";
	import LeftSidebar from "$lib/LeftSidebar.svelte";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

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
		display: grid;
		grid-template-columns: 128px 1fr 128px;
		height: 100dvh;
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
		display: flex;
		flex-direction: column;
		padding: 32px;
		overflow: hidden;
	}
</style>
