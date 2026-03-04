<script lang="ts">
	import Pane from "$lib/Pane.svelte";
	import LogView from "$lib/LogView.svelte";
	import { brandIcons, brandNames } from "$lib/brands";
	import type {
		AssistantEntry,
		RepoSessionSummary,
		UserEntry,
	} from "$lib/messages";
	import BrandIcon from "$lib/BrandIcon.svelte";

	let {
		session,
		selected = false,
		onclick,
	}: {
		session: RepoSessionSummary;
		selected?: boolean;
		onclick: () => void;
	} = $props();

	let formattedTime = $derived(new Date(session.timestamp).toLocaleString());

	let cardEntries = $derived.by(() => {
		let entries = session.lastEntries.map((entry) => {
			if (entry.type === "assistant") {
				const nl = entry.text.indexOf("\n");
				return nl === -1
					? entry
					: { ...entry, text: entry.text.slice(0, nl) };
			}
			return entry;
		});

		// Insert title as a log line before the last assistant message
		const lastAssistantIdx = entries.findLastIndex(
			(e) => e.type === "assistant",
		);
		const titleEntry: UserEntry = {
			type: "user",
			text: session.title,
			timestamp: "",
		};
		if (lastAssistantIdx !== -1) {
			entries = [
				...entries.slice(0, lastAssistantIdx),
				titleEntry,
				...entries.slice(lastAssistantIdx),
			];
		} else {
			entries = [...entries, titleEntry];
		}

		return entries;
	});
</script>

<button class="card" class:selected {onclick}>
	<Pane
		stackedAbove
		stackedBelow
		mode={session.mode}
		animated={session.status === "running" ||
			session.status === "external"}>
		<div class="layout">
			<BrandIcon brand={session.brand} />
			{#if session.lastEntries.length > 0}
				<div class="details">
					<LogView truncateUser log={cardEntries} />
				</div>
			{:else}
				<div class="details empty-state">Awaiting prompt.</div>
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
		filter: brightness(0.9);
	}

	.card.selected {
		filter: brightness(0.8);
	}

	.layout {
		height: 100%;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: 1fr auto;
		grid-template-areas:
			"details details"
			"brand timestamp";
		gap: 8px;
	}

	.layout > :global(:first-child) {
		grid-area: brand;
		align-self: end;
	}

	.details {
		grid-area: details;
		overflow: hidden;
	}

	.details.empty-state {
		display: flex;
		align-items: center;
		color: var(--ctp-subtext0);
	}

	.timestamp {
		grid-area: timestamp;
		justify-self: end;
		font-size: var(--fs-content);
		color: var(--ctp-subtext0);
	}
</style>
