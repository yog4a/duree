import * as vscode from "vscode";
import type { AiFileStats } from "../ai/ai";
import { assignAi } from "../ai/ai.assign";
import { readNewAiEvents } from "../ai/ai-scan";
import { OUTPUT } from "./extension.constants";
import { dayKey, renderHistory, renderToday, summarize, type Heartbeat } from "../heartbeat/heartbeat";
import { appendHeartbeat, listDays, readDay } from "../store/store";

export function takeAi(currentFile: string | null): Map<string, AiFileStats> {
  try {
    return assignAi(readNewAiEvents(), currentFile);
  } catch (error) {
    console.error("duree ai scan failed", error);
    return new Map();
  }
}

export function recordHeartbeat(beat: Heartbeat, onError: () => void): boolean {
  try {
    appendHeartbeat(beat);
    return true;
  } catch (error) {
    onError();
    console.error("duree append failed", error);
    return false;
  }
}

export function showToday(): void {
  const channel = vscode.window.createOutputChannel(OUTPUT);
  channel.clear();
  channel.appendLine(renderToday(summarize(todayBeats())));
  channel.show(true);
}

export function showHistory(): void {
  const rows = listDays().map((day) => ({ day, total: summarize(readDay(day)).total }));
  const channel = vscode.window.createOutputChannel(OUTPUT);
  channel.clear();
  channel.appendLine(renderHistory(rows));
  channel.show(true);
}

function todayBeats(): Heartbeat[] {
  return readDay(dayKey(Date.now() / 1000));
}
