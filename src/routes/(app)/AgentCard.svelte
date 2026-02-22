<script lang="ts">
	import Pane from "$lib/Pane.svelte";
	import { brandIcons, brandNames } from "$lib/brands";
	import type { RepoSession } from "$lib/messages";

	let {
		session,
		selected = false,
		onclick,
	}: {
		session: RepoSession;
		selected?: boolean;
		onclick: () => void;
	} = $props();
</script>

<button class="card" class:selected {onclick}>
	<Pane
		stackedAbove
		stackedBelow
		mode={session.mode}
		animated={session.status === "running"}>
		<div class="layout">
			<picture>
				<source
					srcset={brandIcons[session.brand].dark}
					media="(prefers-color-scheme: dark)" />
				<img
					src={brandIcons[session.brand].light}
					alt={brandNames[session.brand]}
					width="16"
					height="16" />
			</picture>
			<span class="info">
				<span class="agent-name">{session.slug}</span>
				<span class="slug">{session.slug}</span>
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

		& > :global(*) {
			min-height: 128px;
		}
	}

	.card:hover {
		filter: brightness(0.95);
	}

	.card.selected {
		filter: brightness(0.9);
	}

	.layout {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: 1fr auto;
		gap: 8px;
	}

	picture {
		grid-area: 1/2/2/3;
	}

	.info {
		grid-area: 1/1/3/3;
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
