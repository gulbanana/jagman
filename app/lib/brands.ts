import jmLight from "$lib/assets/jm-light.svg";
import jmDark from "$lib/assets/jm-dark.svg";
import ccLight from "$lib/assets/cc-light.svg";
import ccDark from "$lib/assets/cc-dark.svg";
import ocLight from "$lib/assets/oc-light.svg";
import ocDark from "$lib/assets/oc-dark.svg";
import gcLight from "$lib/assets/gc-light.svg";
import gcDark from "$lib/assets/gc-dark.svg";

export type AgentBrand = "cc" | "oc" | "gc";
export type IconBrand = AgentBrand | "jm";

export const brandIcons: Record<IconBrand, { light: string; dark: string }> = {
    jm: { light: jmLight, dark: jmDark },
    cc: { light: ccLight, dark: ccDark },
    oc: { light: ocLight, dark: ocDark },
    gc: { light: gcLight, dark: gcDark },
};

export const brandNames: Record<IconBrand, string> = {
    jm: "JAGMAN",
    cc: "Claude Code",
    oc: "Opencode",
    gc: "GitHub Copilot",
};