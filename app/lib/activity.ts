import type { AgentBrand } from "./brands";

export type ActivitySource = AgentBrand | "jg";

export type ActivityEntry = {
	source: ActivitySource;
	event: string;
	detail: string;
	timestamp: number;
};
