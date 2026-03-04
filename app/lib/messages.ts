import type { AgentBrand } from "./brands";

/* repo stubs for progressive loading */

export type RepoStub = {
	path: string;
	displayPath: string;
};

/* unbranded single-agent data */

export type SessionStatus = "running" | "waiting" | "inactive" | "external";
export type SessionMode = "standard" | "plan" | "yolo";

export type AgentRepoSessionSummary = {
	id: string;
	workspace: string;
	title: string;
	status: SessionStatus;
	mode: SessionMode | null;
	timestamp: number;
	lastEntries: LogEntry[];
};

export type AgentRepoSummary = {
	path: string;
	branch: string;
	sessions: AgentRepoSessionSummary[];
};

/* branded multi-agent data */

export type RepoError = {
	brand: AgentBrand;
	message: string;
};

export type RepoSessionSummary = AgentRepoSessionSummary & {
	brand: AgentBrand;
};

export type RepoSummary = AgentRepoSummary & {
	sessions: RepoSessionSummary[];
	errors: RepoError[];
};

/* unbranded but single-agent log data */

export type UserEntry = { type: 'user'; text: string; timestamp: string };
export type AssistantEntry = { type: 'assistant'; text: string; timestamp: string };
export type ToolUseEntry = { type: 'tool_use'; tool: string; args: Map<string, unknown>; success: boolean; timestamp: string };
export type LogEntry = UserEntry | AssistantEntry | ToolUseEntry;

export type AgentDetail = {
	brand: AgentBrand,
	id: string;
	title: string;
	log: LogEntry[];
};

/* attention items */

export type LaunchPromptDetail = {
	type: "launch-prompt";
	repoPath: string;
	displayPath: string;
	brand: AgentBrand;
};

export type IdlePromptDetail = {
	type: "idle-prompt";
	agent: RepoSessionSummary;
	displayPath: string;
};

export type AttentionDetail = LaunchPromptDetail | IdlePromptDetail;

export type AttentionItem = {
	id: number;
	detail: AttentionDetail;
};