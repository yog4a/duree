import path from "node:path";
import * as vscode from "vscode";
import type { AiFileStats } from "../ai/ai";

export function skipTask(task: vscode.Task): boolean {
  if (task.isBackground) {
    return true;
  }
  return task.name.toLowerCase().includes("watch");
}

export function sourceSlice(document: vscode.TextDocument): string {
  if (document.languageId === "json") {
    return document.getText().slice(0, 500_000);
  }
  const last = Math.min(document.lineCount, 500);
  return document.getText(new vscode.Range(0, 0, last, 0));
}

export function isReviewing(document: vscode.TextDocument): boolean {
  if (document.uri.scheme === "git") {
    return true;
  }
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

export function isAiActive(stats: AiFileStats | undefined): boolean {
  if (!stats) {
    return false;
  }
  return stats.lines > 0 || stats.inputTokens > 0 || stats.outputTokens > 0 || stats.promptLength > 0;
}

export function languageFromPath(file: string): string {
  const ext = path.extname(file).slice(1);
  if (ext.length > 0) {
    return ext;
  }
  return "text";
}
