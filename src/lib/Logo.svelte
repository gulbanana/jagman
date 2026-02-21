<div class="layout">
    <div style="grid-area: J">J</div>
    <div class="suffix">u</div>
    <div class="suffix">j</div>
    <div class="suffix">u</div>
    <div class="suffix">t</div>
    <div class="suffix">s</div>
    <div class="suffix">u</div>
    <div style="grid-area: A">A</div>
    <div style="grid-area: G">G</div>
    <div class="suffix" style="grid-row: 2">e</div>
    <div class="suffix">n</div>
    <div class="suffix">t</div>
    <div style="grid-area: M">M</div>
    <div style="grid-area: B">A</div>
    <div style="grid-area: N">N</div>
    <div class="suffix" style="grid-row: 3">a</div>
    <div class="suffix" style="grid-row: 3">g</div>
    <div class="suffix" style="grid-row: 3">e</div>
    <div class="suffix" style="grid-row: 3">r</div>
</div>

<style>
    .layout {
        font-family: var(--stack-code);
        font-size: 24px;

        display: grid;
        grid-template-areas:
            "J . . . . . ."
            "A G . . . . ."
            "M B N . . . .";
        grid-template-columns: repeat(7, 16px);
        grid-template-rows: 24px 24px 24px;
    }

    .suffix {
        color: var(--ctp-overlay1);
        /* font-weight: lighter; */
    }
</style>
