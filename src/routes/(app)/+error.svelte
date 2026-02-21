<script>
    import { page } from "$app/state";
    import Pane from "$lib/Pane.svelte";
</script>

<Pane>
    <h1>{page.status} {page.error?.message}</h1>
</Pane>

<style></style>
