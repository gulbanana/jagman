<script lang="ts">
	import Pane from "$lib/Pane.svelte";
	import ErrorSpan from "$lib/ErrorSpan.svelte";
	import ControlButton from "$lib/ControlButton.svelte";
	import IdentSpan from "$lib/IdentSpan.svelte";
	import Unbox from "$lib/Unbox.svelte";
	import TextBox from "$lib/TextBox.svelte";

	let { data, form } = $props();
</script>

<div class="settings-grid">
	<Pane>
		{#snippet header()}Database{/snippet}
		<div class="pane-content">
			<div class="actions">
				<form method="POST" action="?/resetDb">
					<ControlButton type="submit">Reset database</ControlButton>
				</form>
				<form method="POST" action="?/dbPush">
					<ControlButton type="submit">Drizzle push</ControlButton>
				</form>
				<form method="POST" action="?/dbGenerate">
					<ControlButton type="submit"
						>Drizzle generate</ControlButton>
				</form>
				<form method="POST" action="?/dbMigrate">
					<ControlButton type="submit">Drizzle migrate</ControlButton>
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
		{#if data.dbStatus.migrated}
			<div class="repos-layout">
				<form
					method="POST"
					action="?/addRepository"
					class="add-repo layout-span">
					<TextBox
						name="path"
						placeholder="absolute repository path"
						ident />
					<ControlButton type="submit">Add</ControlButton>
				</form>

				{#if data.repositories.length === 0}
					<div class="layout-span">No repositories configured.</div>
				{:else}
					{#each data.repositories as repo (repo.id)}
						<Unbox>
							<IdentSpan text={repo.path} />
						</Unbox>
						<form method="POST" action="?/removeRepository">
							<input type="hidden" name="id" value={repo.id} />
							<ControlButton type="submit" intent="override"
								>Remove</ControlButton>
						</form>
					{/each}
				{/if}

				{#if form?.operation === "add-repository" || form?.operation === "remove-repository"}
					{#if form.ok}
						<div class="message ok layout-span">{form.message}</div>
					{:else}
						<ErrorSpan>{form.message}</ErrorSpan>
					{/if}
				{/if}
			</div>
		{:else}
			<ErrorSpan>
				Database is not migrated. Missing tables: {data.dbStatus.missingTables.join(
					", ",
				)}.
			</ErrorSpan>
		{/if}
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

	.actions form {
		display: flex;
	}

	.repos-layout {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;

		& > .add-repo {
			display: grid;
			grid-template-columns: subgrid;
		}
	}

	.layout-span {
		grid-column: 1/3;
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
