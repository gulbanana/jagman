<script lang="ts">
	import { overflowing } from "$lib/overflowing";

	type ActivityKind = "started" | "completed" | "permission" | "approved" | "denied" | "tool" | "error" | "plan" | "yolo";

	type ActivityEntry = {
		kind: ActivityKind;
		agent: string;
		detail: string;
		minutesAgo: number;
	};

	const mockActivity: ActivityEntry[] = [
		{ kind: "tool", agent: "claude-12", detail: "ran npm test", minutesAgo: 0 },
		{ kind: "approved", agent: "opencode-3", detail: "run a command", minutesAgo: 1 },
		{ kind: "permission", agent: "opencode-1", detail: "edit a file", minutesAgo: 1 },
		{ kind: "tool", agent: "claude-12", detail: "edited api.ts", minutesAgo: 2 },
		{ kind: "plan", agent: "claude-7", detail: "jagman", minutesAgo: 3 },
		{ kind: "started", agent: "claude-12", detail: "api-server", minutesAgo: 5 },
		{ kind: "error", agent: "opencode-2", detail: "build failed", minutesAgo: 6 },
		{ kind: "completed", agent: "claude-9", detail: "jagman", minutesAgo: 8 },
		{ kind: "denied", agent: "opencode-1", detail: "rm -rf node_modules", minutesAgo: 10 },
		{ kind: "tool", agent: "claude-9", detail: "ran type check", minutesAgo: 11 },
		{ kind: "approved", agent: "claude-9", detail: "edit a file", minutesAgo: 12 },
		{ kind: "yolo", agent: "opencode-4", detail: "lockhaven", minutesAgo: 14 },
		{ kind: "started", agent: "opencode-4", detail: "lockhaven", minutesAgo: 15 },
		{ kind: "completed", agent: "claude-3", detail: "gg", minutesAgo: 18 },
		{ kind: "tool", agent: "claude-3", detail: "ran cargo build", minutesAgo: 20 },
		{ kind: "started", agent: "claude-3", detail: "gg", minutesAgo: 32 },
	];

	const kindVerb: Record<ActivityKind, string> = {
		started: "started on",
		completed: "finished",
		permission: "asking to",
		approved: "approved:",
		denied: "denied:",
		tool: "",
		error: "error:",
		plan: "plan mode on",
		yolo: "yolo mode on",
	};

	const kindColor: Record<ActivityKind, string> = {
		started: "var(--ctp-green)",
		completed: "var(--ctp-overlay1)",
		permission: "var(--ctp-yellow)",
		approved: "var(--ctp-green)",
		denied: "var(--ctp-red)",
		tool: "var(--ctp-sapphire)",
		error: "var(--ctp-red)",
		plan: "var(--ctp-blue)",
		yolo: "var(--ctp-red)",
	};

	function formatTime(minutesAgo: number): string {
		if (minutesAgo === 0) return "now";
		if (minutesAgo < 60) return `${minutesAgo}m`;
		return `${Math.floor(minutesAgo / 60)}h`;
	}
</script>

<div class="sidebar">
	<div class="header">Activity</div>
	<div class="feed" use:overflowing>
		{#each mockActivity as entry}
			<div class="entry">
				<div class="entry-top">
					<span class="dot" style:background={kindColor[entry.kind]}></span>
					<span class="agent">{entry.agent}</span>
					<span class="time">{formatTime(entry.minutesAgo)}</span>
				</div>
				<div class="entry-detail">
					<span class="verb">{kindVerb[entry.kind]}</span>
					{entry.detail}
				</div>
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
		min-height: 0;
	}

	.header {
		font-family: var(--ff-industrial);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ctp-overlay2);
	}

	.feed {
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
		min-height: 0;

		scrollbar-width: none;
		&::-webkit-scrollbar { display: none; }

		&:global([data-overflowing]) {
			mask-image: linear-gradient(
				to bottom,
				black calc(100% - 64px),
				transparent
			);
		}
	}

	.entry {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.entry-top {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.agent {
		font-family: var(--ff-code);
		font-size: 11px;
		color: var(--ctp-text);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.time {
		font-family: var(--ff-code);
		font-size: 11px;
		color: var(--ctp-overlay1);
		flex-shrink: 0;
	}

	.entry-detail {
		font-family: var(--ff-ui);
		font-size: 11px;
		color: var(--ctp-subtext0);
		padding-left: 12px;
	}

	.verb {
		color: var(--ctp-subtext1);
	}
</style>
