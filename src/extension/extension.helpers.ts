import path from "node:path";
import * as vscode from "vscode";
import type { AiFileStats } from "../ai/ai";
import { dependenciesFromSource } from "../dependencies/dependencies";
import { isAiActive, isReviewing, languageFromPath, sourceSlice } from "./extension.document";
import { gitInfo } from "../git/git";
import { categoryFor, projectRootCount, type Heartbeat } from "../heartbeat/heartbeat";

export type Machine = {
  hostname: string;
  osName: string;
  plugin: string;
  editorName: string;
};

export function heartbeatForDocument(
  file: string,
  isWrite: boolean,
  time: number,
  stats: AiFileStats | undefined,
  editorLines: number,
  meta: Machine & { debugging: boolean; building: boolean },
): Heartbeat {
  const document = vscode.workspace.textDocuments.find((item) => item.uri.fsPath === file);
  const folder = document ? vscode.workspace.getWorkspaceFolder(document.uri) : undefined;
  const info = gitInfo(path.dirname(file));
  const root = info.root ?? folder?.uri.fsPath ?? path.dirname(file);
  const editor = vscode.window.activeTextEditor;
  const position = editor && editor.document.uri.fsPath === file ? editor.selection.active : undefined;
  const aiEdit = (stats?.lines ?? 0) > 0;
  return {
    time,
    entity: file,
    type: "file",
    category: categoryFor({
      aiActive: isAiActive(stats),
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

export function heartbeatForPath(
  file: string,
  time: number,
  stats: AiFileStats,
  editorLines: number,
  meta: Machine,
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
