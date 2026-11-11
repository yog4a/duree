import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { dayKey, type Heartbeat } from "./heartbeat";
import { appendHeartbeat, listDays, readDay } from "./store";

function beat(time: number): Heartbeat {
  return {
    time,
    entity: "/tmp/a.ts",
    type: "file",
    category: "coding",
    project: "app",
    projectRootCount: 1,
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
}

test("a single log is split into daily files and the original is kept", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duree-"));
  const dir = path.join(home, ".duree");
  fs.mkdirSync(dir, { mode: 0o700 });
  const monday = new Date(2026, 10, 9, 12).getTime() / 1000;
  const tuesday = new Date(2026, 10, 10, 12).getTime() / 1000;
  fs.writeFileSync(
    path.join(dir, "heartbeats.jsonl"),
    `${JSON.stringify(beat(monday))}\n${JSON.stringify(beat(tuesday))}\n`,
    { mode: 0o600 },
  );

  assert.deepEqual(listDays(home), [dayKey(monday), dayKey(tuesday)]);
  assert.equal(readDay(dayKey(monday), home).length, 1);
  assert.equal(readDay(dayKey(tuesday), home).length, 1);
  assert.equal(fs.existsSync(path.join(dir, "heartbeats.jsonl.archive")), true);
  assert.equal(fs.existsSync(path.join(dir, "days", `${dayKey(monday)}.jsonl`)), true);

  const wednesday = new Date(2026, 10, 11, 12).getTime() / 1000;
  appendHeartbeat(beat(wednesday), home);
  assert.deepEqual(listDays(home), [dayKey(monday), dayKey(tuesday), dayKey(wednesday)]);
  assert.equal(fs.readdirSync(path.join(dir, "days")).length, 3);
});
