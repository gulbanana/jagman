<div class="layout">
    <div style="grid-area: J">J</div>
    <div style="grid-area: uju" class="suffix column3">
        <div>u</div>
        <div>j</div>
        <div>u</div>
    </div>
    <div style="grid-area: tsu" class="suffix column3">
        <div>t</div>
        <div>s</div>
        <div>u</div>
    </div>
    <div style="grid-area: A">A</div>
    <div style="grid-area: G">G</div>
    <div style="grid-area: ent" class="suffix column3">
        <div>e</div>
        <div>n</div>
        <div>t</div>
    </div>
    <div style="grid-area: M">M</div>
    <div style="grid-area: B">A</div>
    <div style="grid-area: N">N</div>
    <div style="grid-area: ager" class="suffix column4">
        <div>a</div>
        <div>g</div>
        <div>e</div>
        <div>r</div>
    </div>
</div>

<style>
    .layout {
        margin: 8px 0;

        font-family: var(--ff-code);
        font-size: 32px;

        display: grid;
        grid-template-areas:
            "J uju tsu ."
            "A G   ent ."
            "M B   N   ager";
        grid-template-columns: repeat(4, 24px);
        grid-template-rows: 32px 32px 32px;
    }

    .column3 {
        font-size: 12px;
        display: grid;
        align-content: center;
        grid-template-columns: auto auto auto;
    }

    .column4 {
        font-size: 12px;
        padding-top: 3px;
        display: grid;
        grid-template-rows: auto auto;
        grid-template-columns: auto auto;
        & > :nth-child(0n + 2) {
            grid-row: 1;
            grid-column: 2;
        }
        & > :nth-child(0n + 3) {
            grid-row: 2;
            grid-column: 1;
        }
        & > :nth-child(0n + 4) {
            grid-row: 2;
            grid-column: 2;
        }
    }
</style>
