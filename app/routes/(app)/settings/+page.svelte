<script lang="ts">
	import Pane from "$lib/Pane.svelte";
	import ErrorSpan from "$lib/ErrorSpan.svelte";

	let { data, form } = $props();
</script>

<div class="settings-grid">
	<Pane>
		{#snippet header()}Database{/snippet}
		<div class="pane-content">
			<div class="actions">
				<form method="POST" action="?/resetDb">
					<button type="submit" class="button danger"
						>Reset database</button>
				</form>
				<form method="POST" action="?/dbPush">
					<button type="submit" class="button">Drizzle push</button>
				</form>
				<form method="POST" action="?/dbGenerate">
					<button type="submit" class="button"
						>Drizzle generate</button>
				</form>
				<form method="POST" action="?/dbMigrate">
					<button type="submit" class="button"
						>Drizzle migrate</button>
				</form>
			</div>

			<div class="hint">
				Reset drops all database tables; run Drizzle push/migrate before
				using repository settings.
			</div>

			{#if form?.operation === "reset-db" || form?.operation === "db-push" || form?.operation === "db-generate" || form?.operation === "db-migrate"}
				{#if form.ok}
					<div class="message ok">{form.message}</div>
				{:else}
					<ErrorSpan>{form.message}</ErrorSpan>
				{/if}
			{/if}
		</div>
	</Pane>

	<Pane>
		{#snippet header()}Repositories{/snippet}
		<div class="pane-content">
			{#if data.dbStatus.migrated}
				<form method="POST" action="?/addRepository" class="add-repo">
					<input
						type="text"
						name="path"
						placeholder="Absolute repository path"
						required />
					<button type="submit" class="button">Add</button>
				</form>

				{#if data.repositories.length === 0}
					<div class="hint">No repositories configured.</div>
				{:else}
					<ul class="repo-list">
						{#each data.repositories as repo (repo.id)}
							<li class="repo-row">
								<span class="repo-path">{repo.path}</span>
								<form method="POST" action="?/removeRepository">
									<input
										type="hidden"
										name="id"
										value={repo.id} />
									<button type="submit" class="button danger"
										>Remove</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			{:else}
				<ErrorSpan>
					Database is not migrated. Missing tables: {data.dbStatus.missingTables.join(
						", ",
					)}.
				</ErrorSpan>
			{/if}

			{#if form?.operation === "add-repository" || form?.operation === "remove-repository"}
				{#if form.ok}
					<div class="message ok">{form.message}</div>
				{:else}
					<ErrorSpan>{form.message}</ErrorSpan>
				{/if}
			{/if}
		</div>
	</Pane>
</div>

<style>
	.settings-grid {
		display: grid;
		grid-template-rows: auto auto;
		gap: 16px;
	}

	.pane-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.actions form,
	.repo-row form {
		display: flex;
	}

	.button {
		width: 100%;
		padding: 8px 16px;
		border-radius: 8px;
		border: 2px solid var(--ctp-overlay0);
		background: var(--ctp-mantle);
		color: var(--ctp-text);
		font-family: var(--ff-ui);
		font-weight: 600;
		cursor: pointer;
	}

	.button:hover {
		border-color: var(--ctp-blue);
	}

	.button.danger {
		border-color: var(--ctp-red);
		color: var(--ctp-red);
	}

	.button.danger:hover {
		border-color: var(--ctp-maroon);
		color: var(--ctp-maroon);
	}

	.add-repo {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
	}

	.add-repo input {
		min-width: 0;
		padding: 8px;
		border-radius: 8px;
		border: 2px solid var(--ctp-overlay0);
		background: var(--ctp-mantle);
		color: var(--ctp-text);
		font-family: var(--ff-code);
	}

	.repo-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.repo-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 8px;
		align-items: center;
		padding: 8px;
		border: 2px solid var(--ctp-overlay0);
		border-radius: 8px;
		background: var(--ctp-base);
	}

	.repo-path {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--ff-code);
		color: var(--ctp-text);
	}

	.hint {
		color: var(--ctp-subtext0);
		font-family: var(--ff-ui);
	}

	.message {
		padding: 8px;
		border-radius: 8px;
		font-family: var(--ff-ui);
	}

	.message.ok {
		border: 2px solid var(--ctp-green);
		color: var(--ctp-green);
	}
</style>
