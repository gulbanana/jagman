import ccLight from "$lib/assets/cc-light.svg";
import ccDark from "$lib/assets/cc-dark.svg";
import ocLight from "$lib/assets/oc-light.svg";
import ocDark from "$lib/assets/oc-dark.svg";
import gcLight from "$lib/assets/gc-light.svg";
import gcDark from "$lib/assets/gc-dark.svg";

export type AgentBrand = "cc" | "oc" | "gc";

export const brandIcons: Record<AgentBrand, { light: string; dark: string }> = {
    cc: { light: ccLight, dark: ccDark },
    oc: { light: ocLight, dark: ocDark },
    gc: { light: gcLight, dark: gcDark },
};

export const brandNames: Record<AgentBrand, string> = {
    cc: "Claude Code",
    oc: "Opencode",
    gc: "GitHub Copilot",
};