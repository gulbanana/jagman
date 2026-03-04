<!-- @component Shaped like a TextBox, but not coloured like it - for lining things up in layouts. -->

<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        children,
    }: {
        children: Snippet;
    } = $props();
</script>

<div class="box">
    {@render children()}
</div>

<style>
    .box {
        outline: none;
        border: 1px solid transparent;
        border-radius: 4px;
        padding: 4px 8px;
    }
</style>
