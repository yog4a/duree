import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseAiLine, tailStart, type AiEvent } from "./ai";
import { jsonlFiles } from "./ai-scan.files";
import { readOffsets, writeOffsets } from "./ai-scan.offsets";

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
  if (lastNewline === -1) {
    return { events: [], end: length >= MAX_TAIL ? from + length : from };
  }
  const body = buffer.subarray(0, lastNewline).toString("utf8");
  const events: AiEvent[] = [];
  for (const line of body.split("\n")) {
    if (line.length === 0) {
      continue;
    }
    const event = parseAiLine(line, file);
    if (event) {
      events.push(event);
    }
  }
  return { events, end: from + lastNewline + 1 };
}
