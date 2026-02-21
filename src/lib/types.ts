export type AgentStatus = "running" | "waiting" | "completed";
export type AgentMode = "standard" | "plan" | "yolo";

export type Agent = {
	id: string;
	name: string;
	status: AgentStatus;
	mode?: AgentMode;
	detail: string;
	log: string[];
};

export type Repo = {
	path: string;
	branch: string;
	agents: Agent[];
};

export type Commit = {
	hash: string;
	author: string;
	message: string;
	age: string;
};
