import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_GAP_SECONDS,
  SESSION_GAP_SECONDS,
  categoryFor,
  entityLabel,
  dayKey,
  formatDuration,
  lineChangeCount,
  projectRootCount,
  renderHistory,
  renderToday,
  shouldRecord,
  summarize,
  type Heartbeat,
} from "./heartbeat";

function beat(time: number, project = "polymarket"): Heartbeat {
  return {
    time,
    project,
    entity: "/tmp/main.ts",
    type: "file",
    category: "coding",
    projectRootCount: 2,
    branch: null,
    language: "typescript",
    dependencies: [],
    lines: 1,
    lineno: 1,
    cursorpos: 1,
    isWrite: false,
    hostname: "localhost",
    editor: "Cursor",
    plugin: "duree/0.3.0",
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

test("first heartbeat is kept, typing inside two minutes is dropped, a save is kept", () => {
  assert.equal(shouldRecord(undefined, 1_000, false), true);
  assert.equal(shouldRecord(1_000, 1_000 + MIN_GAP_SECONDS - 1, false), false);
  assert.equal(shouldRecord(1_000, 1_000 + MIN_GAP_SECONDS, false), true);
  assert.equal(shouldRecord(1_000, 1_001, true), true);
});

test("gaps inside a session add up, a long pause starts over", () => {
  const summary = summarize([
    beat(0),
    beat(120, "codetime"),
    beat(180, "codetime"),
    beat(180 + SESSION_GAP_SECONDS),
    beat(180 + SESSION_GAP_SECONDS + 60),
  ]);
  assert.equal(summary.total, 240);
  assert.equal(summary.byProject.get("polymarket"), 180);
  assert.equal(summary.byProject.get("codetime"), 60);
  assert.equal(summary.byLanguage.get("typescript"), 240);
  assert.equal(summary.byCategory.get("coding"), 240);
});

test("entity label drops the project root the way WakaTime does", () => {
  assert.equal(
    entityLabel({
      entity: "/Users/user/projects/wakatime/models/user.py",
      projectRootCount: 5,
    }),
    "models/user.py",
  );
});

test("today view lists the same slices as a WakaTime summary", () => {
  const summary = summarize([beat(0), beat(60)]);
  const text = renderToday(summary);
  for (const title of ["Projets", "Langages", "Catégories", "Branches", "Fichiers", "Éditeurs", "Machines"]) {
    assert.equal(text.includes(title), true);
  }
  assert.equal(text.includes("polymarket: 1m (100%)"), true);
});

test("project root count matches the WakaTime path example", () => {
  assert.equal(projectRootCount("/Users/user/projects/wakatime"), 5);
  assert.equal(projectRootCount(""), 0);
});

test("a keystroke changes no line, a newline and a deletion do", () => {
  assert.equal(lineChangeCount(3, 3, "a"), 0);
  assert.equal(lineChangeCount(3, 3, "\n"), 1);
  assert.equal(lineChangeCount(3, 6, ""), 3);
});

test("ai activity wins, then debug, build, review, coding", () => {
  assert.equal(categoryFor({ aiActive: true, debugging: true, building: true, reviewing: true }), "ai coding");
  assert.equal(categoryFor({ aiActive: false, debugging: true, building: true, reviewing: true }), "debugging");
  assert.equal(categoryFor({ aiActive: false, debugging: false, building: true, reviewing: true }), "building");
  assert.equal(categoryFor({ aiActive: false, debugging: false, building: false, reviewing: true }), "code reviewing");
  assert.equal(categoryFor({ aiActive: false, debugging: false, building: false, reviewing: false }), "coding");
});

test("a timestamp stays on its local calendar day", () => {
  const noon = new Date(2026, 10, 11, 12, 0, 0).getTime() / 1000;
  assert.equal(dayKey(noon), "2026-11-11");
});

test("history lists every day and names its file", () => {
  const text = renderHistory([
    { day: "2026-11-10", total: 60 },
    { day: "2026-11-11", total: 120 },
  ]);
  assert.equal(text.includes("2026-11-11: 2m  ~/.duree/days/2026-11-11.jsonl"), true);
  assert.equal(text.includes("2026-11-10: 1m  ~/.duree/days/2026-11-10.jsonl"), true);
  assert.ok(text.indexOf("2026-11-11") < text.indexOf("2026-11-10"));
  assert.equal(text.includes("Total: 3m"), true);
});

test("duration format", () => {
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(59), "0m");
  assert.equal(formatDuration(60), "1m");
  assert.equal(formatDuration(3_660), "1h 1m");
});
