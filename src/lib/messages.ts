import type { AgentBrand } from "./brands";

export type SessionStatus = "running" | "waiting" | "inactive";
export type SessionMode = "standard" | "plan" | "yolo";

export type RepoError = {
	brand: AgentBrand;
	message: string;
};

export type Repo = {
	path: string;
	branch: string;
	sessions: RepoSession[];
	errors: RepoError[];
};

export type RepoSession = {
	brand: AgentBrand,
	id: string;
	slug: string;
	status: SessionStatus;
	mode: SessionMode | null;
	timestamp: number;
	lastAssistantText: string | null;
};

export type UserEntry = { type: 'user'; text: string; timestamp: string };
export type AssistantEntry = { type: 'assistant'; text: string; timestamp: string };
export type ToolUseEntry = { type: 'tool_use'; tool: string; args: Map<string, unknown>; success: boolean; timestamp: string };
export type LogEntry = UserEntry | AssistantEntry | ToolUseEntry;

export type AgentSession = {
	brand: AgentBrand,
	id: string;
	slug: string;
	log: LogEntry[];
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
