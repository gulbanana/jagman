<script lang="ts">
	import { overflowing } from "$lib/overflowing";
	import { brandIcons } from "$lib/brands";
	import type { ActivitySource } from "$lib/activity";
	import jgLight from "$lib/assets/jg-light.svg";
	import jgDark from "$lib/assets/jg-dark.svg";
	import EventHeader from "$lib/EventHeader.svelte";
	import { getActivity } from "./data.remote";

	const sourceIcons: Record<ActivitySource, { light: string; dark: string }> =
		{
			...brandIcons,
			jg: { light: jgLight, dark: jgDark },
		};

	const entries = $derived(await getActivity());

	$effect(() => {
		const source = new EventSource("/activity");

		source.addEventListener("activity", () => {
			getActivity().refresh();
		});

		return () => {
			source.close();
		};
	});

	function formatTime(timestamp: number): string {
		const minutesAgo = Math.floor((Date.now() - timestamp) / 60_000);
		if (minutesAgo <= 0) return "now";
		if (minutesAgo < 60) return `${minutesAgo}m`;
		return `${Math.floor(minutesAgo / 60)}h`;
	}
</script>

<div class="sidebar">
	<div class="feed" use:overflowing>
		{#each entries as entry (entry.timestamp)}
			<div class="entry">
				<picture class="icon">
					<source
						srcset={sourceIcons[entry.source].dark}
						media="(prefers-color-scheme: dark)" />
					<img
						src={sourceIcons[entry.source].light}
						alt={entry.source}
						width="16"
						height="16" />
				</picture>
				<EventHeader>{entry.event}</EventHeader>
				<span class="detail">
					{formatTime(entry.timestamp)}
					&middot;
					{entry.detail}
				</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		padding: 16px 0;
		gap: 8px;
		overflow: hidden;
	}

	.feed {
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
		min-height: 0;

		scrollbar-width: none;
		&::-webkit-scrollbar {
			display: none;
		}

		&:global([data-overflowing]) {
			mask-image: linear-gradient(
				to bottom,
				black calc(100% - 64px),
				transparent
			);
		}
	}

	.entry {
		display: grid;
		grid-template-columns: 20px 1fr;
		grid-template-rows: auto auto;
		gap: 2px;
	}

	.icon {
		grid-row: 1;
		grid-column: 1;
		display: flex;
		align-items: center;
	}

	.detail {
		grid-area: 2/1/3/3;

		font-size: var(--fs-content);

		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
