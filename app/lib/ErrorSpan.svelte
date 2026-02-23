<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        children,
    }: {
        children: Snippet;
    } = $props();
</script>

<span class="error-message">
    {@render children()}
</span>

<style>
    .error-message {
        color: var(--ctp-maroon);
        font-family: var(--ff-code);
        white-space: pre-wrap;
        word-break: break-word;
        user-select: text;
    }
</style>
