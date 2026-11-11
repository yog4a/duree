import os from "node:os";
import * as vscode from "vscode";
import { AI_SCAN_MS } from "./extension.constants";
import { skipTask } from "./extension.document";
import type { Machine } from "./extension.helpers";
import { recordHeartbeat, showHistory, showToday } from "./extension.journal";
import { flushAi, trackFile, type TrackState } from "./extension.track";
import { dayKey, formatDuration, lineChangeCount, summarize } from "../heartbeat/heartbeat";
import { readDay } from "../store/store";

export function activate(context: vscode.ExtensionContext): void {
  let building = 0;
  const machine: Machine = {
    hostname: os.hostname(),
    osName: `${os.type()} ${os.release()}`,
    plugin: `duree/${String(context.extension.packageJSON.version ?? "0.3.0")}`,
    editorName: `Cursor/${vscode.version}`,
  };
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  status.command = "duree.showToday";
  status.tooltip = "Durée. Local coding time, today. Nothing is sent.";

  const state: TrackState = {
    lastByEntity: new Map(),
    lineChanges: new Map(),
    machine,
    record: (beat) => recordHeartbeat(beat, () => {
      status.text = "$(error) Durée";
      status.show();
    }),
    refresh: () => {
      status.text = `$(watch) ${formatDuration(summarize(readDay(dayKey(Date.now() / 1000))).total)}`;
      status.show();
    },
  };

  const beat = (document: vscode.TextDocument, isWrite: boolean) => {
    if (document.uri.scheme !== "file") {
      return;
    }
    trackFile(state, document.uri.fsPath, isWrite, vscode.debug.activeDebugSession !== undefined, building > 0);
  };

  const timer = setInterval(() => {
    const activeEditor = vscode.window.activeTextEditor;
    const current = activeEditor?.document.uri.scheme === "file" ? activeEditor.document.uri.fsPath : null;
    flushAi(state, current);
  }, AI_SCAN_MS);

  context.subscriptions.push(
    status,
    { dispose: () => clearInterval(timer) },
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        beat(editor.document, false);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme !== "file") {
        return;
      }
      for (const change of event.contentChanges) {
        const count = lineChangeCount(change.range.start.line, change.range.end.line, change.text);
        if (count === 0) {
          continue;
        }
        const file = event.document.uri.fsPath;
        state.lineChanges.set(file, (state.lineChanges.get(file) ?? 0) + count);
      }
      beat(event.document, false);
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      beat(document, true);
    }),
    vscode.tasks.onDidStartTask((event) => {
      if (!skipTask(event.execution.task)) {
        building += 1;
      }
    }),
    vscode.tasks.onDidEndTask((event) => {
      if (!skipTask(event.execution.task)) {
        building = Math.max(0, building - 1);
      }
    }),
    vscode.commands.registerCommand("duree.showToday", () => {
      showToday();
    }),
    vscode.commands.registerCommand("duree.showHistory", () => {
      showHistory();
    }),
  );

  state.refresh();
  const active = vscode.window.activeTextEditor;
  if (active) {
    beat(active.document, false);
  }
}

export function deactivate(): void {}
