import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { projectRootCount } from "../heartbeat/heartbeat";
import { listDays, readDay } from "./store";
import { projectFromBeat } from "./store.project";

test("a legacy relative path becomes owner/repo", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duree-home-"));
  const user = path.join(home, "yogaa");
  const repo = path.join(user, "development", "codetime");
  fs.mkdirSync(path.join(repo, "src"), { recursive: true });
  execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", "https://github.com/yog4a/duree.git"], { cwd: repo, stdio: "ignore" });

  assert.equal(
    projectFromBeat({ entity: "development/codetime/src/a.ts", project: "yogaa" }, user),
    "yog4a/duree",
  );
  assert.equal(
    projectFromBeat({ entity: "development/codetime/src/missing/a.ts", project: "yogaa" }, user),
    "yog4a/duree",
  );
});

test("a repo without origin keeps the full folder path", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "duree-repo-"));
  fs.mkdirSync(repo, { recursive: true });
  execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
  const file = path.join(repo, "a.ts");
  fs.writeFileSync(file, "");
  assert.equal(
    projectFromBeat({ entity: file, project: "old", projectRootCount: projectRootCount(repo) }, os.homedir()),
    repo,
  );
});

test("splitting the old log rewrites the project name", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duree-split-"));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "duree-split-repo-"));
  execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", "https://github.com/yog4a/duree.git"], { cwd: repo, stdio: "ignore" });
  const file = path.join(repo, "a.ts");
  const when = new Date(2026, 10, 11, 12).getTime() / 1000;
  const beat = {
    time: when,
    entity: file,
    type: "file",
    category: "coding",
    project: "codetime",
    projectRootCount: projectRootCount(repo),
    branch: null,
    language: "typescript",
    dependencies: [],
    lines: 1,
    lineno: 1,
    cursorpos: 1,
    isWrite: false,
    hostname: "localhost",
    editor: "Cursor",
    plugin: "duree/0.4.0",
    os: "linux",
    humanLineChanges: 0,
    aiLineChanges: 0,
    aiSession: null,
    aiInputTokens: 0,
    aiOutputTokens: 0,
    aiPromptLength: 0,
    aiSubscriptionPlan: null,
  };
  const dir = path.join(home, ".duree");
  fs.mkdirSync(dir, { mode: 0o700 });
  fs.writeFileSync(path.join(dir, "heartbeats.jsonl"), `${JSON.stringify(beat)}\n`, { mode: 0o600 });

  assert.equal(listDays(home).length, 1);
  assert.equal(readDay(listDays(home)[0], home)[0].project, "yog4a/duree");
  assert.equal(fs.existsSync(path.join(dir, "heartbeats.jsonl.archive")), true);
});
