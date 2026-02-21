<script lang="ts">
	let {
		kind,
		title,
		description
	}: { kind: string; title: string; description: string } = $props();
</script>

<div class="card">
	<div class="kind">{kind}</div>
	<div class="title">{title}</div>
	<div class="description">{description}</div>
</div>

<style>
	.card {
		padding: 8px 16px;
		border: 2px solid var(--ctp-overlay0);
		border-radius: 8px;
		background: var(--ctp-crust);
		min-width: 256px;
	}

	.kind {
		font-family: var(--stack-industrial);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ctp-overlay2);
		margin-bottom: 2px;
	}

	.title {
		font-family: var(--stack-ui);
		font-size: 14px;
		font-weight: 600;
		color: var(--ctp-text);
	}

	.description {
		font-family: var(--stack-code);
		font-size: 12px;
		color: var(--ctp-subtext0);
		margin-top: 2px;
	}
</style>
