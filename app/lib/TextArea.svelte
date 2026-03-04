<script lang="ts">
    interface Props {
        name: string;
        placeholder: string;
    }

    let { name, placeholder }: Props = $props();
</script>

<textarea required {name} {placeholder}></textarea>

<style>
    textarea {
        outline: none;
        resize: none;

        border: 1px solid var(--ctp-overlay0);
        border-radius: 4px;
        padding: 4px 8px;

        background-color: var(--ctp-base);
        color: var(--ctp-text);

        &:focus-visible {
            border-color: var(--ctp-lavender);
            box-shadow: inset 0 0 0 1px var(--ctp-lavender);
        }

        &:disabled {
            background-color: transparent;
        }

        &::placeholder {
            color: var(--ctp-subtext0);
        }
    }
</style>
