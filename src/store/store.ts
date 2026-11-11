import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dayKey, type Heartbeat } from "../heartbeat/heartbeat";
import { DAY_FILE, DIR_MODE, FILE_MODE } from "./store.constants";
import { migrateProjects, readBeats } from "./store.migrate";

export function dataDir(home = os.homedir()): string {
  const next = path.join(home, ".duree");
  const previous = path.join(home, ".codetime");
  if (!fs.existsSync(next) && fs.existsSync(previous)) {
    fs.renameSync(previous, next);
  }
  return next;
}

export function daysDir(home = os.homedir()): string {
  return path.join(dataDir(home), "days");
}

export function appendHeartbeat(beat: Heartbeat, home = os.homedir()): void {
  migrateProjects(home);
  const file = path.join(daysDir(home), `${dayKey(beat.time)}.jsonl`);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: DIR_MODE });
  fs.appendFileSync(file, `${JSON.stringify(beat)}\n`, { mode: FILE_MODE });
}

export function readDay(day: string, home = os.homedir()): Heartbeat[] {
  migrateProjects(home);
  return readBeats(path.join(daysDir(home), `${day}.jsonl`));
}

export function listDays(home = os.homedir()): string[] {
  migrateProjects(home);
  const dir = daysDir(home);
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const days: string[] = [];
  for (const name of names) {
    const match = DAY_FILE.exec(name);
    if (match) {
      days.push(match[1]);
    }
  }
  days.sort();
  return days;
}
