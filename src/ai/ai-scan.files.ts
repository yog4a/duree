import fs from "node:fs";
import path from "node:path";

export function jsonlFiles(dir: string, depth: number): string[] {
  if (depth < 0) {
    return [];
  }
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...jsonlFiles(full, depth - 1));
    } else if (entry.name.endsWith(".jsonl")) {
      files.push(full);
    }
  }
  return files;
}
