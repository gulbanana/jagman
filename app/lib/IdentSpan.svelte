<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        text,
    }: {
        text: string;
    } = $props();
</script>

<span class="identifier" title={text}>
    {text}
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
