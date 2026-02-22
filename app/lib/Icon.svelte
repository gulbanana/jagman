<script lang="ts">
    import sprite from "feather-icons/dist/feather-sprite.svg";

    interface Props {
        name: string;
    }

    let { name }: Props = $props();
</script>

<svg class="feather" viewBox="0 0 24 24">
    <use href="{sprite}#{name}" />
</svg>

<style>
    .feather {
        pointer-events: none;
        height: 16px;
        width: 16px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
    }
</style>
