<script lang="ts">
    import type { IconBrand } from "./brands";
    import { brandIcons, brandNames } from "./brands";

    let { brand }: { brand: IconBrand } = $props();
</script>

<picture class="brand">
    <source
        srcset={brandIcons[brand].dark}
        media="(prefers-color-scheme: dark)" />
    <img
        src={brandIcons[brand].light}
        alt={brandNames[brand]}
        width="16"
        height="16" />
</picture>
