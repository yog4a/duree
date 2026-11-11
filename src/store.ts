import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Heartbeat } from "./heartbeat";

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

export function dataDir(home = os.homedir()): string {
  const next = path.join(home, ".duree");
  const previous = path.join(home, ".codetime");
  if (!fs.existsSync(next) && fs.existsSync(previous)) fs.renameSync(previous, next);
  return next;
}

export function heartbeatsPath(): string {
  return path.join(dataDir(), "heartbeats.jsonl");
}

export function appendHeartbeat(beat: Heartbeat): void {
  const file = heartbeatsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: DIR_MODE });
  fs.appendFileSync(file, `${JSON.stringify(beat)}\n`, { mode: FILE_MODE });
}

export function readHeartbeats(): Heartbeat[] {
  const file = heartbeatsPath();
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const beats: Heartbeat[] = [];
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    try {
      beats.push(JSON.parse(line) as Heartbeat);
    } catch (error) {
      console.error("duree skipped a bad heartbeat line", error);
    }
  }
  return beats;
}
