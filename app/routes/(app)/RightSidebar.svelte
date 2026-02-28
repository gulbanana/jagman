<script lang="ts">
	import { overflowing } from "$lib/overflowing";
	import { brandIcons, type AgentBrand } from "$lib/brands";
	import jgLight from "$lib/assets/jg-light.svg";
	import jgDark from "$lib/assets/jg-dark.svg";
	import EventHeader from "$lib/EventHeader.svelte";

	type ActivitySource = AgentBrand | "jg";

	type ActivityEntry = {
		source: ActivitySource;
		event: string;
		detail: string;
		minutesAgo: number;
	};

	const mockActivity: ActivityEntry[] = [
		{
			source: "cc",
			event: "tool_use",
			detail: "Bash (npm test)",
			minutesAgo: 0,
		},
		{
			source: "oc",
			event: "approved",
			detail: "Bash (git status)",
			minutesAgo: 1,
		},
		{
			source: "oc",
			event: "permission",
			detail: "Edit (api.ts)",
			minutesAgo: 1,
		},
		{
			source: "cc",
			event: "tool_use",
			detail: "Edit (api.ts)",
			minutesAgo: 2,
		},
		{
			source: "cc",
			event: "plan",
			detail: "entered plan mode",
			minutesAgo: 3,
		},
		{
			source: "jg",
			event: "startup",
			detail: "claude-12 on api-server",
			minutesAgo: 5,
		},
		{
			source: "oc",
			event: "error",
			detail: "Bash (npm run build)",
			minutesAgo: 6,
		},
		{
			source: "jg",
			event: "idle",
			detail: "claude-9 finished jagman",
			minutesAgo: 8,
		},
		{
			source: "oc",
			event: "denied",
			detail: "Bash (rm -rf node_modules)",
			minutesAgo: 10,
		},
		{
			source: "cc",
			event: "tool_use",
			detail: "Bash (npm run check)",
			minutesAgo: 11,
		},
		{
			source: "cc",
			event: "approved",
			detail: "Edit (auth.ts)",
			minutesAgo: 12,
		},
		{
			source: "oc",
			event: "yolo",
			detail: "entered yolo mode",
			minutesAgo: 14,
		},
		{
			source: "jg",
			event: "startup",
			detail: "opencode-4 on lockhaven",
			minutesAgo: 15,
		},
		{
			source: "jg",
			event: "idle",
			detail: "claude-3 finished gg",
			minutesAgo: 18,
		},
		{
			source: "cc",
			event: "tool_use",
			detail: "Bash (cargo build)",
			minutesAgo: 20,
		},
		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},
		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},

		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},

		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},

		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},
		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},

		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},

		{
			source: "jg",
			event: "startup",
			detail: "claude-3 on gg",
			minutesAgo: 32,
		},
	];

	const sourceIcons: Record<ActivitySource, { light: string; dark: string }> =
		{
			...brandIcons,
			jg: { light: jgLight, dark: jgDark },
		};

	function formatTime(minutesAgo: number): string {
		if (minutesAgo === 0) return "now";
		if (minutesAgo < 60) return `${minutesAgo}m`;
		return `${Math.floor(minutesAgo / 60)}h`;
	}
</script>

<div class="sidebar">
	<div class="feed" use:overflowing>
		{#each mockActivity as entry, i (i)}
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
					{formatTime(entry.minutesAgo)}
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
