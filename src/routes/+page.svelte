<script>
    import Column from "$lib/Column.svelte";
</script>

<div class="layout">
    <Column>
        <p>Here is a repository with some agents.</p>
    </Column>

    <Column>
        <p>Here is another repository.</p>
    </Column>

    <Column>
        <p>Here is the attention area.</p>
    </Column>
</div>

<style>
    .layout {
        display: flex;
        gap: 32px;
        margin: 32px;

        & > :global(:last-child) {
            flex: 1;
        }
    }
</style>
