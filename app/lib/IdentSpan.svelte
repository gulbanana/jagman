<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        children,
    }: {
        children: Snippet;
    } = $props();
</script>

<span class="identifier">
    {@render children()}
</span>

<style>
    .identifier {
        font-family: var(--ff-code);

        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;

        user-select: text;
    }
</style>
