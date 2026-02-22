<script lang="ts">
	import type { Snippet } from "svelte";
	import type { SessionMode } from "$lib/messages";

	let {
		header,
		children,
		mode = null,
		animated = false,
		stackedAbove = false,
		stackedBelow = false,
	}: {
		header?: Snippet;
		children: Snippet;
		mode?: SessionMode | null;
		animated?: boolean;
		stackedAbove?: boolean;
		stackedBelow?: boolean;
	} = $props();

	const modeColors: Record<SessionMode, { base: string; spark: string }> = {
		standard: { base: "var(--ctp-peach)", spark: "var(--ctp-yellow)" },
		plan: { base: "var(--ctp-blue)", spark: "var(--ctp-lavender)" },
		yolo: { base: "var(--ctp-red)", spark: "var(--ctp-pink)" },
	};

	const colors = $derived(mode ? modeColors[mode] : null);
</script>

<div
	class="pane"
	class:stacked-above={stackedAbove}
	class:stacked-below={stackedBelow}
	class:has-mode={colors !== null}
	class:animated={animated && colors !== null}
	style:--mode-base={colors?.base}
	style:--mode-spark={colors?.spark}>
	{#if header}
		<div class="header">
			{@render header()}
		</div>
	{/if}
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	@property --spark-angle {
		syntax: "<angle>";
		initial-value: 0deg;
		inherits: false;
	}

	.pane {
		border: 2px solid var(--ctp-overlay0);
		border-radius: 8px;
		background-color: var(--ctp-crust);
		overflow: hidden;
		display: grid;
		grid-template-rows: auto 1fr;
		grid-template-columns: minmax(0, auto);
	}

	.pane.has-mode {
		border-color: var(--mode-base);
	}

	.pane.animated {
		border-color: transparent;
		background:
			linear-gradient(var(--ctp-crust), var(--ctp-crust)) padding-box,
			conic-gradient(
					from var(--spark-angle),
					var(--mode-base) 0deg,
					var(--mode-spark) 4deg,
					var(--mode-base) 64deg,
					var(--mode-base) 360deg
				)
				border-box;
		animation: spark-rotate 2s
			linear(0, 0.176 16.67%, 0.324 33.33%, 0.676 66.67%, 0.824 83.33%, 1)
			infinite;
	}

	@media (prefers-color-scheme: light) {
		.pane.animated {
			background:
				linear-gradient(var(--ctp-crust), var(--ctp-crust)) padding-box,
				conic-gradient(
						from var(--spark-angle),
						var(--mode-spark) 0deg,
						var(--mode-base) 4deg,
						var(--mode-spark) 64deg,
						var(--mode-spark) 360deg
					)
					border-box;
		}
	}

	@keyframes spark-rotate {
		to {
			--spark-angle: 360deg;
		}
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
		height: 32px;
		padding: 8px 16px;
		overflow: hidden;

		border-bottom: 1px solid var(--ctp-overlay0);
		background: var(--ctp-mantle);
		color: var(--ctp-subtext1);
		font-family: var(--stack-industrial);
		font-size: 14px;

		display: flex;
		gap: 8px;
	}

	.content {
		grid-row: 2;
		padding: 8px;
	}
</style>
