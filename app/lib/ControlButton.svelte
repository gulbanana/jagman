<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        intent?: "confirm" | "override";
        type?: "button" | "submit" | "reset" | undefined;
        onclick?: () => void;
        children: Snippet;
    }

    let { intent, type, onclick, children }: Props = $props();
</script>

<button
    class="control-button"
    class:confirm={intent === "confirm"}
    class:override={intent === "override"}
    {type}
    {onclick}>
    {@render children()}
</button>

<style>
    .control-button {
        cursor: pointer;

        padding: 0px 14px 2px 14px;

        font-family: var(--ff-ui);
        font-weight: 600;

        border: 2px solid transparent;
        border-radius: 4px;

        background: var(--ctp-surface1);
        color: var(--ctp-text);

        &:hover {
            border-color: var(--ctp-lavender);
        }
    }

    .confirm {
        background: var(--ctp-green);
        color: var(--ctp-base);
    }

    .override {
        background: var(--ctp-red);
        color: var(--ctp-base);
    }
</style>
