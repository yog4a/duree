import type { Category } from "./heartbeat.types";

/** Segment count of the project root. `/Users/user/projects/sample` is 5. */
export function projectRootCount(root: string): number {
  if (root.length === 0) {
    return 0;
  }
  return root.split(/[/\\]/).length;
}

export function lineChangeCount(startLine: number, endLine: number, text: string): number {
  const removed = Math.max(0, endLine - startLine);
  let added = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      added++;
    }
  }
  return removed + added;
}

export function categoryFor(input: {
  aiActive: boolean;
  debugging: boolean;
  building: boolean;
  reviewing: boolean;
}): Category {
  if (input.aiActive) {
    return "ai coding";
  }
  if (input.debugging) {
    return "debugging";
  }
  if (input.building) {
    return "building";
  }
  if (input.reviewing) {
    return "code reviewing";
  }
  return "coding";
}

/** Local calendar day for a unix timestamp, `YYYY-MM-DD`. */
export function dayKey(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
