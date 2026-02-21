<script lang="ts">
	import "$lib/theme.css";
	import favicon from "$lib/assets/favicon.svg";
	import Logo from "$lib/Logo.svelte";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="layout">
	<div class="left">
		<Logo />
	</div>

	{@render children()}

	<div class="right">
		<Logo />
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: auto 1fr auto;
		height: 100dvh;
		overflow: hidden;
	}

	.left,
	.right {
		background: var(--ctp-mantle);
		border-color: var(--ctp-overlay0);
		border-style: solid;
		padding-top: 16px;
	}

	.left {
		border-width: 2px 2px 2px 0;
		border-radius: 0 32px 32px 0;
		padding-right: 16px;
	}

	.right {
		border-width: 2px 0 2px 2px;
		border-radius: 32px 0 0 32px;
		padding-left: 16px;
	}
</style>
