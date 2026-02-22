import type { AgentBrand } from "./brands";

export type SessionStatus = "running" | "waiting" | "completed";
export type SessionMode = "standard" | "plan" | "yolo";

export type Repo = {
	path: string;
	branch: string;
	sessions: RepoSession[];
};

export type RepoSession = {
	brand: AgentBrand,
	id: string;
	slug: string;
	status: SessionStatus;
	mode: SessionMode | null;
	timestamp: string;
};

export type AgentSession = {
	brand: AgentBrand,
	id: string;
	slug: string;
	log: string[];
};

export type Commit = {
	hash: string;
	author: string;
	message: string;
	age: string;
};

export type AttentionCardType = "permission-command" | "permission-edit" | "prompt" | "review";

export type AttentionCardData = {
	type: AttentionCardType;
};
