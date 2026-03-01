<script lang="ts">
	import ErrorSpan from "$lib/ErrorSpan.svelte";
	import RightSidebar from "./RightSidebar.svelte";
	import LeftSidebar from "./LeftSidebar.svelte";

	let { children } = $props();
</script>

<div class="layout">
	<div class="left">
		<LeftSidebar />
	</div>

	<div class="center">
		<svelte:boundary>
			{@render children()}
			{#snippet pending()}
				<div class="status-message">Loading...</div>
			{/snippet}
			{#snippet failed(error)}
				<div class="status-message">
					<ErrorSpan>
						{error instanceof Error ? error.message : error}
					</ErrorSpan>
				</div>
			{/snippet}
		</svelte:boundary>
	</div>

	<div class="right">
		<svelte:boundary>
			<RightSidebar />
			{#snippet pending()}
				<div class="status-message">Loading...</div>
			{/snippet}
			{#snippet failed(error)}
				<div class="status-message">
					<ErrorSpan>
						{error instanceof Error ? error.message : error}
					</ErrorSpan>
				</div>
			{/snippet}
		</svelte:boundary>
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

		& > * {
			overflow: hidden;
		}
	}

	.left,
	.right {
		background: var(--ctp-mantle);
		border-color: var(--ctp-overlay0);
		border-style: solid;
		padding: 16px 8px;
		display: flex;
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
	}

	@media (max-width: 1919px) {
		.center {
			padding: 16px;
		}
	}

	.status-message {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--ff-ui);
		color: var(--ctp-subtext0);
	}
</style>
