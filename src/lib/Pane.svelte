<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		header,
		children,
		borderColor,
		stackedAbove = false,
		stackedBelow = false,
	}: {
		header?: Snippet;
		children: Snippet;
		borderColor?: string;
		stackedAbove?: boolean;
		stackedBelow?: boolean;
	} = $props();
</script>

<div
	class="pane"
	class:stacked-above={stackedAbove}
	class:stacked-below={stackedBelow}
	style:border-color={borderColor}>
	{#if header}
		<div class="header" style:border-color={borderColor}>
			{@render header()}
		</div>
	{/if}
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.pane {
		border: 2px solid var(--ctp-overlay0);
		border-radius: 8px;
		background-color: var(--ctp-crust);
		overflow: hidden;
	}

	.pane.stacked-above {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}

	.pane.stacked-below {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.header {
		padding: 8px 16px;
		background: var(--ctp-mantle);
		border-bottom: 1px solid var(--ctp-overlay0);
		border-bottom-color: var(--ctp-overlay0) !important;
		font-family: var(--stack-industrial);
		font-size: 14px;
		color: var(--ctp-subtext1);
	}

	.content {
		padding: 8px;
	}
</style>
