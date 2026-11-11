/** Gap above this starts a new session and counts as zero. */
export const SESSION_GAP_SECONDS = 15 * 60;

/** Non-write heartbeats for the same file are dropped inside this window. */
export const MIN_GAP_SECONDS = 2 * 60;

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

export function shouldRecord(
  previousTime: number | undefined,
  time: number,
  isWrite: boolean,
): boolean {
  if (previousTime === undefined) return true;
  if (isWrite) return true;
  return time - previousTime >= MIN_GAP_SECONDS;
}

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

/** Time between two heartbeats counts for where you were, until you leave. */
export function summarize(beats: Heartbeat[]): Summary {
  const sorted = [...beats].sort((a, b) => a.time - b.time);
  const summary = emptySummary();
  for (const beat of sorted) {
    summary.aiInputTokens += beat.aiInputTokens ?? 0;
    summary.aiOutputTokens += beat.aiOutputTokens ?? 0;
    summary.aiPromptLength += beat.aiPromptLength ?? 0;
    summary.humanLineChanges += beat.humanLineChanges ?? 0;
    summary.aiLineChanges += beat.aiLineChanges ?? 0;
  }
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].time - sorted[i - 1].time;
    if (gap <= 0 || gap >= SESSION_GAP_SECONDS) continue;
    summary.total += gap;
    const previous = sorted[i - 1];
    add(summary.byProject, previous.project || "unknown", gap);
    add(summary.byLanguage, previous.language || "unknown", gap);
    add(summary.byCategory, previous.category || "coding", gap);
    add(summary.byBranch, previous.branch || "unknown", gap);
    add(summary.byEntity, entityLabel(previous), gap);
    add(summary.byEditor, previous.editor || "Cursor", gap);
    add(summary.byOs, previous.os || "unknown", gap);
    add(summary.byMachine, previous.hostname || "unknown", gap);
  }
  return summary;
}

export function entityLabel(beat: Pick<Heartbeat, "entity" | "projectRootCount">): string {
  const parts = beat.entity.split(/[/\\]/);
  if (beat.projectRootCount > 0 && parts.length > beat.projectRootCount) {
    return parts.slice(beat.projectRootCount).join("/");
  }
  return parts[parts.length - 1] || beat.entity;
}

export function ranked(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function renderToday(summary: Summary): string {
  const lines = [`Today: ${formatDuration(summary.total)}`, ""];
  const sections: [string, Map<string, number>, number][] = [
    ["Projects", summary.byProject, 20],
    ["Languages", summary.byLanguage, 20],
    ["Categories", summary.byCategory, 20],
    ["Branches", summary.byBranch, 20],
    ["Files", summary.byEntity, 15],
    ["Editors", summary.byEditor, 10],
    ["Systems", summary.byOs, 10],
    ["Machines", summary.byMachine, 10],
  ];
  for (const [title, map, limit] of sections) {
    lines.push(title);
    const rows = ranked(map).slice(0, limit);
    if (rows.length === 0) lines.push("  —");
    for (const [name, seconds] of rows) {
      const share = summary.total > 0 ? Math.round((seconds / summary.total) * 100) : 0;
      lines.push(`  ${name}: ${formatDuration(seconds)} (${share}%)`);
    }
    lines.push("");
  }
  lines.push("Activity");
  lines.push(`  human lines: ${summary.humanLineChanges}`);
  lines.push(`  AI lines: ${summary.aiLineChanges}`);
  lines.push(`  input tokens: ${summary.aiInputTokens}`);
  lines.push(`  output tokens: ${summary.aiOutputTokens}`);
  lines.push(`  prompt length: ${summary.aiPromptLength}`);
  lines.push("", "Today's file: ~/.duree/days/");
  return lines.join("\n");
}

function emptySummary(): Summary {
  return {
    total: 0,
    byProject: new Map(),
    byLanguage: new Map(),
    byCategory: new Map(),
    byBranch: new Map(),
    byEntity: new Map(),
    byEditor: new Map(),
    byOs: new Map(),
    byMachine: new Map(),
    aiInputTokens: 0,
    aiOutputTokens: 0,
    aiPromptLength: 0,
    humanLineChanges: 0,
    aiLineChanges: 0,
  };
}

function add(map: Map<string, number>, key: string, gap: number): void {
  map.set(key, (map.get(key) ?? 0) + gap);
}

/** Segment count of the project root. `/Users/user/projects/sample` is 5. */
export function projectRootCount(root: string): number {
  if (root.length === 0) return 0;
  return root.split(/[/\\]/).length;
}

export function lineChangeCount(startLine: number, endLine: number, text: string): number {
  const removed = Math.max(0, endLine - startLine);
  let added = 0;
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") added++;
  return removed + added;
}

export function categoryFor(input: {
  aiActive: boolean;
  debugging: boolean;
  building: boolean;
  reviewing: boolean;
}): Category {
  if (input.aiActive) return "ai coding";
  if (input.debugging) return "debugging";
  if (input.building) return "building";
  if (input.reviewing) return "code reviewing";
  return "coding";
}

/** Local calendar day for a unix timestamp, `YYYY-MM-DD`. */
export function dayKey(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function renderHistory(days: { day: string; total: number }[]): string {
  const lines = ["History", ""];
  const sorted = [...days].sort((a, b) => b.day.localeCompare(a.day));
  if (sorted.length === 0) lines.push("No days yet.");
  let sum = 0;
  for (const row of sorted) {
    sum += row.total;
    lines.push(`${row.day}: ${formatDuration(row.total)}  ~/.duree/days/${row.day}.jsonl`);
  }
  lines.push("", `Total: ${formatDuration(sum)}`);
  lines.push("Day files in days/ are kept.");
  return lines.join("\n");
}

export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
