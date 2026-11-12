import { MIN_GAP_SECONDS, SESSION_GAP_SECONDS } from "./heartbeat.constants";
import type { Heartbeat, Summary } from "./heartbeat.types";

export { MIN_GAP_SECONDS, SESSION_GAP_SECONDS } from "./heartbeat.constants";
export type { Category, Heartbeat, Summary } from "./heartbeat.types";
export { categoryFor, dayKey, lineChangeCount, projectRootCount } from "./heartbeat.metrics";
export { formatDuration, renderHistory, renderToday } from "./heartbeat.helpers";

export function shouldRecord(previousTime: number | undefined, time: number, isWrite: boolean): boolean {
  if (previousTime === undefined) {
    return true;
  }
  if (isWrite) {
    return true;
  }
  return time - previousTime >= MIN_GAP_SECONDS;
}

/** Time between two heartbeats counts for where you were, until you leave. */
export function summarize(beats: Heartbeat[]): Summary {
  const sorted = [...beats].sort((a, b) => a.time - b.time);
  const summary = emptySummary();
  for (const beat of sorted) {
    summary.aiInputTokens += beat.aiInputTokens ?? 0;
    summary.aiOutputTokens += beat.aiOutputTokens ?? 0;
    summary.aiPromptLength += beat.aiPromptLength ?? 0;
    const human = beat.humanLineChanges ?? 0;
    const ai = beat.aiLineChanges ?? 0;
    if (beat.category === "ai coding") {
      summary.aiLineChanges += human + ai;
    } else {
      summary.humanLineChanges += human;
      summary.aiLineChanges += ai;
    }
  }
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].time - sorted[i - 1].time;
    if (gap <= 0 || gap >= SESSION_GAP_SECONDS) {
      continue;
    }
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
