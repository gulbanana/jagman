<script lang="ts">
	import Pane from "$lib/Pane.svelte";

	let {
		name,
		status,
		mode,
		slug,
		selected = false,
		onclick
	}: {
		name: string;
		status: "running" | "waiting" | "completed";
		mode?: "standard" | "plan" | "yolo";
		slug: string;
		selected?: boolean;
		onclick: () => void;
	} = $props();

	const statusColors: Record<string, string> = {
		running: "var(--ctp-green)",
		waiting: "var(--ctp-yellow)",
		completed: "var(--ctp-overlay1)"
	};

	const modeColors: Record<string, string> = {
		standard: "var(--ctp-peach)",
		plan: "var(--ctp-blue)",
		yolo: "var(--ctp-red)"
	};

	const borderColor = $derived(mode ? modeColors[mode] : undefined);
</script>

<button class="card" class:selected {onclick}>
	<Pane stackedAbove stackedBelow {borderColor}>
		<div class="body">
			<span class="dot" style:background={statusColors[status]}></span>
			<span class="info">
				<span class="agent-name">{name}</span>
				<span class="slug">{slug}</span>
			</span>
		</div>
	</Pane>
</button>

<style>
	.card {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		text-align: left;
		color: var(--ctp-text);
	}

	.card:hover {
		filter: brightness(0.95);
	}

	.card.selected {
		filter: brightness(0.9);
	}

	.body {
		display: flex;
		align-items: start;
		gap: 8px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 4px;
		flex-shrink: 0;
		margin-top: 4px;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.agent-name {
		font-family: var(--stack-code);
		font-size: 13px;
		font-weight: 600;
	}

	.slug {
		font-size: 12px;
		color: var(--ctp-subtext0);
	}
</style>
