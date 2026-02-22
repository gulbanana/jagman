<script lang="ts">
	import { page } from "$app/state";
	import { getAgentDetail } from "./data.remote";
	import type { ToolUseEntry } from "$lib/messages";
	import ErrorSpan from "$lib/ErrorSpan.svelte";

	const agentQuery = getAgentDetail(page.params.id ?? "");
	const agent = $derived(agentQuery.current);

	function formatToolUse(entry: ToolUseEntry): string {
		const args = entry.args;

		// Pick the most informative arg for common tools
		const summary =
			(args.get("command") as string) ?? // Bash
			(args.get("file_path") as string) ?? // Read, Edit, Write
			(args.get("pattern") as string) ?? // Grep, Glob
			(args.get("description") as string) ?? // Task
			null;
		if (summary) return summary;

		// Unrecognised tool: summarise from args
		if (args.size === 1) {
			const [, value] = args.entries().next().value as [string, unknown];
			return `${value}`;
		}
		if (args.size > 1) {
			const parts = [...args].map(([k, v]) => `${k}: ${v}`);
			return parts.join(", ");
		}

		return "";
	}
</script>

{#if agentQuery.error}
	<div class="status">
		<ErrorSpan
			>{agentQuery.error.message ??
				"Failed to load agent session."}</ErrorSpan>
	</div>
{:else if agentQuery.loading}
	<div class="status">Loading...</div>
{:else if agent}
	<svelte:boundary>
		<div class="log">
			{#each agent.log as entry, i (i)}
				{#if entry.type === "user"}
					<div class="log-line user">{entry.text}</div>
				{:else if entry.type === "assistant"}
					<div class="log-line assistant">
						<span class="dot dot-assistant"></span>
						<span class="text">{entry.text}</span>
					</div>
				{:else if entry.type === "tool_use"}
					<div class="log-line">
						<span
							class="dot"
							class:dot-success={entry.success}
							class:dot-failure={!entry.success}></span>
						<span class="text"
							>{entry.tool}<span class="tool-use"
								>({formatToolUse(entry)})</span
							></span>
					</div>
				{/if}
			{/each}
		</div>
		{#snippet failed(error)}
			<div class="status">
				<ErrorSpan>
					Render error: {error instanceof Error
						? error.message
						: error}
				</ErrorSpan>
			</div>
		{/snippet}
	</svelte:boundary>
{:else}
	<div class="status">Loading...</div>
{/if}

<style>
	.status {
		color: var(--ctp-subtext0);
		font-family: var(--stack-ui);
	}

	.log {
		font-family: var(--stack-code);
		font-size: 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	.log-line {
		display: grid;
		grid-template-columns: 16px 1fr;
		align-items: start;
		padding: 4px 8px;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.user {
		display: block;
		background: var(--ctp-text);
		color: var(--ctp-crust);
	}

	.assistant {
		color: var(--ctp-text);
	}

	.tool-use {
		color: var(--ctp-overlay1);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 4px;
		margin-top: 2px;
	}

	.dot-assistant {
		background: var(--ctp-text);
	}

	.dot-success {
		background: var(--ctp-green);
	}

	.dot-failure {
		background: var(--ctp-red);
	}
</style>
