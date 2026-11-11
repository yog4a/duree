import fs from "node:fs";
import path from "node:path";
import { dataDir } from "../store/store";

export function readOffsets(home: string): Record<string, number> {
  try {
    const parsed = JSON.parse(fs.readFileSync(offsetsFile(home), "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, number>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    return {};
  }
}

export function writeOffsets(home: string, offsets: Record<string, number>): void {
  const file = offsetsFile(home);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(offsets), { mode: 0o600 });
}

function offsetsFile(home: string): string {
  return path.join(dataDir(home), "ai-offsets.json");
}
