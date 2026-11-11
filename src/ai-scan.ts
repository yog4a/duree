import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseAiLine, tailStart, type AiEvent } from "./ai";
import { dataDir } from "./store";

const MAX_TAIL = 2_000_000;
const DEPTH = 6;

export function readNewAiEvents(home = os.homedir()): AiEvent[] {
  const offsets = readOffsets(home);
  const priming = Object.keys(offsets).length === 0;
  const events: AiEvent[] = [];
  for (const root of [
    path.join(home, ".claude", "projects"),
    path.join(home, ".codex", "sessions"),
    path.join(home, ".cursor", "projects"),
  ]) {
    for (const file of jsonlFiles(root, DEPTH)) {
      let size = 0;
      try {
        size = fs.statSync(file).size;
      } catch {
        continue;
      }
      if (priming) {
        offsets[file] = size;
        continue;
      }
      const start = tailStart(size, offsets[file] ?? 0);
      if (start >= size) {
        offsets[file] = size;
        continue;
      }
      const tail = readTail(file, start, size);
      offsets[file] = tail.end;
      events.push(...tail.events);
    }
  }
  writeOffsets(home, offsets);
  return events;
}

function readTail(file: string, start: number, size: number): { events: AiEvent[]; end: number } {
  const length = Math.min(size - start, MAX_TAIL);
  const from = start;
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, buffer, 0, length, from);
  } finally {
    fs.closeSync(fd);
  }
  const lastNewline = buffer.lastIndexOf(0x0a);
  if (lastNewline === -1) return { events: [], end: length >= MAX_TAIL ? from + length : from };
  const body = buffer.subarray(0, lastNewline).toString("utf8");
  const events: AiEvent[] = [];
  for (const line of body.split("\n")) {
    if (line.length === 0) continue;
    const event = parseAiLine(line, file);
    if (event) events.push(event);
  }
  return { events, end: from + lastNewline + 1 };
}

function jsonlFiles(dir: string, depth: number): string[] {
  if (depth < 0) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...jsonlFiles(full, depth - 1));
    else if (entry.name.endsWith(".jsonl")) files.push(full);
  }
  return files;
}

function offsetsFile(home: string): string {
  return path.join(dataDir(home), "ai-offsets.json");
}

function readOffsets(home: string): Record<string, number> {
  try {
    const parsed = JSON.parse(fs.readFileSync(offsetsFile(home), "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    return {};
  }
}

function writeOffsets(home: string, offsets: Record<string, number>): void {
  const file = offsetsFile(home);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(offsets), { mode: 0o600 });
}
