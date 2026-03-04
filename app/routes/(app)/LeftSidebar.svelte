<script>
    import FeatherIcon from "$lib/FeatherIcon.svelte";
    import Logo from "./Logo.svelte";
</script>

<ul class="menu">
    <li><a href="/"><FeatherIcon name="home" /> Dashboard</a></li>
    <li><a href="/settings"><FeatherIcon name="settings" /> Settings</a></li>
    <li><Logo /></li>
</ul>

<style>
    .menu {
        list-style: none;

        height: calc(100% - 32px);
        margin: 16px 0;
        padding: 0;

        display: flex;
        flex-direction: column;
        gap: 24px;

        font-size: var(--fs-body);
    }

    li:last-child {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: end;
    }
</style>
