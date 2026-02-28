<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        intent: "approve" | "deny";
        onclick?: () => void;
        children: Snippet;
    }

    let { intent, onclick, children }: Props = $props();
</script>

<button
    class="control-button"
    class:approve={intent === "approve"}
    class:deny={intent === "deny"}
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
    }

    .approve {
        background: var(--ctp-green);
        color: var(--ctp-base);

        &:hover {
            border-color: var(--ctp-surface1);
        }
    }

    .deny {
        background: var(--ctp-surface1);
        color: var(--ctp-text);

        &:hover {
            border-color: var(--ctp-text);
        }
    }
</style>
