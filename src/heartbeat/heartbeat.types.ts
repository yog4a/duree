export type Category = "coding" | "ai coding" | "debugging" | "building" | "code reviewing";

export type Heartbeat = {
  time: number;
  entity: string;
  type: "file";
  category: Category;
  project: string;
  projectRootCount: number;
  branch: string | null;
  language: string;
  dependencies: string[];
  lines: number;
  lineno: number | null;
  cursorpos: number | null;
  isWrite: boolean;
  hostname: string;
  editor: string;
  plugin: string;
  os: string;
  humanLineChanges: number;
  aiLineChanges: number;
  aiSession: string | null;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiPromptLength: number;
  aiSubscriptionPlan: string | null;
};

export type Summary = {
  total: number;
  byProject: Map<string, number>;
  byLanguage: Map<string, number>;
  byCategory: Map<string, number>;
  byBranch: Map<string, number>;
  byEntity: Map<string, number>;
  byEditor: Map<string, number>;
  byOs: Map<string, number>;
  byMachine: Map<string, number>;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiPromptLength: number;
  humanLineChanges: number;
  aiLineChanges: number;
};
