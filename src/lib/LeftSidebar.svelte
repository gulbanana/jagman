<script>
    import Logo from "./Logo.svelte";
</script>

<ul class="menu">
    <li><Logo /></li>
    <li><a href="/settings">Settings</a></li>
</ul>

<style>
    .menu {
        list-style: none;
        margin: 0;
        padding: 0;

        display: flex;
        flex-direction: column;
        gap: 24px;
    }
</style>
