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

	let formattedTime = $derived(new Date(session.timestamp).toLocaleString());
</script>

<button class="card" class:selected {onclick}>
	<Pane
		stackedAbove
		stackedBelow
		mode={session.mode}
		animated={session.status === "running"}>
		<div class="layout">
			<picture class="brand">
				<source
					srcset={brandIcons[session.brand].dark}
					media="(prefers-color-scheme: dark)" />
				<img
					src={brandIcons[session.brand].light}
					alt={brandNames[session.brand]}
					width="16"
					height="16" />
			</picture>
			<span class="title">{session.title}</span>
			{#if session.lastAssistantText}
				<span class="details">{session.lastAssistantText}</span>
			{:else}
				<span class="details awaiting">Awaiting prompt.</span>
			{/if}
			<time class="timestamp">{formattedTime}</time>
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
		height: 100%;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto 1fr auto;
		grid-template-areas:
			"title title"
			"details details"
			"brand timestamp";
		gap: 8px;
	}

	.brand {
		grid-area: brand;
		align-self: end;
	}

	.title {
		grid-area: title;
		font-family: var(--stack-code);
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.details {
		grid-area: details;
		font-family: var(--stack-code);
		font-size: 12px;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		max-height: 56px;
	}

	.details.awaiting {
		display: flex;
		align-items: center;
		font-style: italic;
		color: var(--ctp-overlay1);
	}

	.timestamp {
		grid-area: timestamp;
		justify-self: end;
		font-family: var(--stack-code);
		font-size: 11px;
		color: var(--ctp-subtext0);
	}
</style>
