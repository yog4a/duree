import os from "node:os";
import path from "node:path";
import * as vscode from "vscode";
import { assignAi, type AiFileStats } from "./ai";
import { readNewAiEvents } from "./ai-scan";
import { dependenciesFromSource } from "./dependencies";
import { gitInfo } from "./git";
import {
  categoryFor,
  formatDuration,
  lineChangeCount,
  projectRootCount,
  dayKey,
  renderHistory,
  renderToday,
  shouldRecord,
  summarize,
  type Heartbeat,
} from "./heartbeat";
import { appendHeartbeat, listDays, readDay } from "./store";

const OUTPUT = "Durée";
const AI_SCAN_MS = 60_000;

let statusItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const lastByEntity = new Map<string, number>();
  const lineChanges = new Map<string, number>();
  let building = 0;
  const hostname = os.hostname();
  const osName = `${os.type()} ${os.release()}`;
  const plugin = `duree/${String(context.extension.packageJSON.version ?? "0.3.0")}`;
  const editorName = `Cursor/${vscode.version}`;

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusItem = status;
  status.command = "duree.showToday";
  status.tooltip = "Durée. Local coding time, today. Nothing is sent.";

  const refresh = () => {
    status.text = `$(watch) ${formatDuration(summarize(todayBeats()).total)}`;
    status.show();
  };

  const tracked = (file: string, isWrite: boolean) => {
    const previous = lastByEntity.get(file);
    const time = Date.now() / 1000;
    if (!shouldRecord(previous, time, isWrite)) return;
    const ai = takeAi(file);
    const stats = ai.get(file);
    ai.delete(file);
    if (!record(heartbeatForDocument(file, isWrite, time, stats, lineChanges.get(file) ?? 0, {
      hostname,
      osName,
      plugin,
      editorName,
      debugging: vscode.debug.activeDebugSession !== undefined,
      building: building > 0,
    }))) {
      return;
    }
    lineChanges.delete(file);
    lastByEntity.set(file, time);
    for (const [other, otherStats] of ai) {
      if (!record(heartbeatForPath(other, time, otherStats, lineChanges.get(other) ?? 0, {
        hostname,
        osName,
        plugin,
        editorName,
      }))) {
        return;
      }
      lineChanges.delete(other);
      lastByEntity.set(other, time);
    }
    refresh();
  };

  const beat = (document: vscode.TextDocument, isWrite: boolean) => {
    if (document.uri.scheme !== "file") return;
    tracked(document.uri.fsPath, isWrite);
  };

  const flushIdle = () => {
    const current = vscode.window.activeTextEditor?.document.uri.scheme === "file"
      ? vscode.window.activeTextEditor.document.uri.fsPath
      : null;
    const ai = takeAi(current);
    if (ai.size === 0) return;
    const time = Date.now() / 1000;
    for (const [file, stats] of ai) {
      if (!record(heartbeatForPath(file, time, stats, lineChanges.get(file) ?? 0, {
        hostname,
        osName,
        plugin,
        editorName,
      }))) {
        return;
      }
      lineChanges.delete(file);
      lastByEntity.set(file, time);
    }
    refresh();
  };

  const timer = setInterval(flushIdle, AI_SCAN_MS);
  context.subscriptions.push(
    status,
    { dispose: () => clearInterval(timer) },
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) beat(editor.document, false);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme !== "file") return;
      for (const change of event.contentChanges) {
        const count = lineChangeCount(change.range.start.line, change.range.end.line, change.text);
        if (count === 0) continue;
        const file = event.document.uri.fsPath;
        lineChanges.set(file, (lineChanges.get(file) ?? 0) + count);
      }
      beat(event.document, false);
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      beat(document, true);
    }),
    vscode.tasks.onDidStartTask((event) => {
      if (!skipTask(event.execution.task)) building += 1;
    }),
    vscode.tasks.onDidEndTask((event) => {
      if (!skipTask(event.execution.task)) building = Math.max(0, building - 1);
    }),
    vscode.commands.registerCommand("duree.showToday", () => {
      showToday();
    }),
    vscode.commands.registerCommand("duree.showHistory", () => {
      showHistory();
    }),
  );

  refresh();
  const active = vscode.window.activeTextEditor;
  if (active) beat(active.document, false);
}

export function deactivate(): void {}

type Meta = {
  hostname: string;
  osName: string;
  plugin: string;
  editorName: string;
};

function heartbeatForDocument(
  file: string,
  isWrite: boolean,
  time: number,
  stats: AiFileStats | undefined,
  editorLines: number,
  meta: Meta & { debugging: boolean; building: boolean },
): Heartbeat {
  const document = vscode.workspace.textDocuments.find((item) => item.uri.fsPath === file);
  const folder = document ? vscode.workspace.getWorkspaceFolder(document.uri) : undefined;
  const info = gitInfo(path.dirname(file));
  const root = info.root ?? folder?.uri.fsPath ?? path.dirname(file);
  const editor = vscode.window.activeTextEditor;
  const position = editor && editor.document.uri.fsPath === file ? editor.selection.active : undefined;
  const aiEdit = (stats?.lines ?? 0) > 0;
  const active = isAiActive(stats);
  return {
    time,
    entity: file,
    type: "file",
    category: categoryFor({
      aiActive: active,
      debugging: meta.debugging,
      building: meta.building,
      reviewing: document ? isReviewing(document) : false,
    }),
    project: path.basename(root),
    projectRootCount: projectRootCount(root),
    branch: info.branch,
    language: document?.languageId ?? languageFromPath(file),
    dependencies: document ? dependenciesFromSource(document.languageId, sourceSlice(document)) : [],
    lines: document?.lineCount ?? 0,
    lineno: position ? position.line + 1 : null,
    cursorpos: position ? position.character + 1 : null,
    isWrite,
    hostname: meta.hostname,
    editor: meta.editorName,
    plugin: meta.plugin,
    os: meta.osName,
    humanLineChanges: aiEdit ? 0 : editorLines,
    aiLineChanges: aiEdit ? Math.max(stats?.lines ?? 0, editorLines) : 0,
    aiSession: stats?.session ?? null,
    aiInputTokens: stats?.inputTokens ?? 0,
    aiOutputTokens: stats?.outputTokens ?? 0,
    aiPromptLength: stats?.promptLength ?? 0,
    aiSubscriptionPlan: stats?.plan ?? null,
  };
}

function heartbeatForPath(
  file: string,
  time: number,
  stats: AiFileStats,
  editorLines: number,
  meta: Meta,
): Heartbeat {
  const info = gitInfo(path.dirname(file));
  const root = info.root ?? path.dirname(file);
  const aiEdit = stats.lines > 0;
  return {
    time,
    entity: file,
    type: "file",
    category: "ai coding",
    project: path.basename(root),
    projectRootCount: projectRootCount(root),
    branch: info.branch,
    language: languageFromPath(file),
    dependencies: [],
    lines: 0,
    lineno: null,
    cursorpos: null,
    isWrite: aiEdit,
    hostname: meta.hostname,
    editor: meta.editorName,
    plugin: meta.plugin,
    os: meta.osName,
    humanLineChanges: aiEdit ? 0 : editorLines,
    aiLineChanges: aiEdit ? Math.max(stats.lines, editorLines) : 0,
    aiSession: stats.session,
    aiInputTokens: stats.inputTokens,
    aiOutputTokens: stats.outputTokens,
    aiPromptLength: stats.promptLength,
    aiSubscriptionPlan: stats.plan,
  };
}

function sourceSlice(document: vscode.TextDocument): string {
  if (document.languageId === "json") return document.getText().slice(0, 500_000);
  const last = Math.min(document.lineCount, 500);
  return document.getText(new vscode.Range(0, 0, last, 0));
}

function isReviewing(document: vscode.TextDocument): boolean {
  if (document.uri.scheme === "git") return true;
  const target = document.uri.toString();
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      if (
        input instanceof vscode.TabInputTextDiff &&
        (input.original.toString() === target || input.modified.toString() === target)
      ) {
        return true;
      }
    }
  }
  return false;
}

function skipTask(task: vscode.Task): boolean {
  if (task.isBackground) return true;
  return task.name.toLowerCase().includes("watch");
}

function isAiActive(stats: AiFileStats | undefined): boolean {
  if (!stats) return false;
  return stats.lines > 0 || stats.inputTokens > 0 || stats.outputTokens > 0 || stats.promptLength > 0;
}

function takeAi(currentFile: string | null): Map<string, AiFileStats> {
  try {
    return assignAi(readNewAiEvents(), currentFile);
  } catch (error) {
    console.error("duree ai scan failed", error);
    return new Map();
  }
}

function record(beat: Heartbeat): boolean {
  try {
    appendHeartbeat(beat);
    return true;
  } catch (error) {
    if (statusItem) {
      statusItem.text = "$(error) Durée";
      statusItem.show();
    }
    console.error("duree append failed", error);
    return false;
  }
}

function languageFromPath(file: string): string {
  const ext = path.extname(file).slice(1);
  return ext.length > 0 ? ext : "text";
}

function todayBeats(): Heartbeat[] {
  return readDay(dayKey(Date.now() / 1000));
}

function showToday(): void {
  const channel = vscode.window.createOutputChannel(OUTPUT);
  channel.clear();
  channel.appendLine(renderToday(summarize(todayBeats())));
  channel.show(true);
}

function showHistory(): void {
  const rows = listDays().map((day) => ({ day, total: summarize(readDay(day)).total }));
  const channel = vscode.window.createOutputChannel(OUTPUT);
  channel.clear();
  channel.appendLine(renderHistory(rows));
  channel.show(true);
}
