import fs from "node:fs";
import path from "node:path";
import { dayKey, type Heartbeat } from "../heartbeat/heartbeat";
import { DAY_FILE, DIR_MODE, FILE_MODE } from "./store.constants";
import { projectFromBeat } from "./store.project";
import { dataDir, daysDir } from "./store";

const PROJECT_MARKER = "project-names-v1";

export function migrateProjects(home: string): void {
  const hadLegacy = fs.existsSync(path.join(dataDir(home), "heartbeats.jsonl"));
  migrateLegacy(home);
  const marker = path.join(dataDir(home), PROJECT_MARKER);
  if (!hadLegacy && fs.existsSync(marker)) {
    return;
  }
  const dir = daysDir(home);
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  for (const name of names) {
    if (DAY_FILE.test(name)) {
      rewriteProjects(path.join(dir, name), home);
    }
  }
  fs.writeFileSync(marker, "ok\n", { mode: FILE_MODE });
}

export function readBeats(file: string): Heartbeat[] {
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const beats: Heartbeat[] = [];
  for (const line of raw.split("\n")) {
    if (line.length === 0) {
      continue;
    }
    try {
      beats.push(JSON.parse(line) as Heartbeat);
    } catch (error) {
      console.error("duree skipped a bad heartbeat line", error);
    }
  }
  return beats;
}

function migrateLegacy(home: string): void {
  const dir = dataDir(home);
  const legacy = path.join(dir, "heartbeats.jsonl");
  const migrating = path.join(dir, "heartbeats.jsonl.migrating");
  if (fs.existsSync(legacy)) {
    fs.renameSync(legacy, migrating);
  }
  if (!fs.existsSync(migrating)) {
    return;
  }
  for (const beat of readBeats(migrating)) {
    const next = { ...beat, project: projectFromBeat(beat, home) };
    const file = path.join(dir, "days", `${dayKey(next.time)}.jsonl`);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: DIR_MODE });
    fs.appendFileSync(file, `${JSON.stringify(next)}\n`, { mode: FILE_MODE });
  }
  fs.renameSync(migrating, path.join(dir, "heartbeats.jsonl.archive"));
}

function rewriteProjects(file: string, home: string): void {
  const beats = readBeats(file);
  let changed = false;
  const next = beats.map((beat) => {
    const project = projectFromBeat(beat, home);
    if (project === beat.project) {
      return beat;
    }
    changed = true;
    return { ...beat, project };
  });
  if (!changed) {
    return;
  }
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, next.map((beat) => JSON.stringify(beat)).join("\n") + "\n", { mode: FILE_MODE });
  fs.renameSync(tmp, file);
}
