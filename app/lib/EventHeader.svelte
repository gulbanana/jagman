<script>
    let { children } = $props();
</script>

<div class="event-header">{@render children()}</div>

<style>
    .event-header {
        color: var(--ctp-subtext0);
        font-family: var(--ff-industrial);
        font-size: var(--fs-header);
        text-transform: uppercase;

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
