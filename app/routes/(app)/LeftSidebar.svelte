<script>
    import Icon from "$lib/Icon.svelte";
    import Logo from "$lib/Logo.svelte";
</script>

<ul class="menu">
    <li><Logo /></li>
    <li><a href="/"><Icon name="home" /> Dashboard</a></li>
    <li><a href="/settings"><Icon name="settings" /> Settings</a></li>
    <li><a href="/widgets"><Icon name="package" /> Widgets</a></li>
</ul>

<style>
    .menu {
        list-style: none;
        margin: 0;
        padding: 0;

        display: flex;
        flex-direction: column;
        gap: 24px;

        font-size: 16px;
    }
</style>
