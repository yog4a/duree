import { SKIP_WALK, WALK_DEPTH } from "./ai.constants";

export function collectEdits(
  node: unknown,
  cwd: string | undefined,
  files: { path: string; lines: number }[],
  depth: number,
): void {
  if (depth > WALK_DEPTH || !node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectEdits(item, cwd, files, depth + 1);
    }
    return;
  }
  const obj = node as Record<string, unknown>;
  const raw = stringField(obj, "file_path") ?? stringField(obj, "filePath") ?? stringField(obj, "target_file");
  const edited =
    typeof obj.old_string === "string" || typeof obj.new_string === "string" || typeof obj.content === "string";
  if (raw && edited) {
    const filePath = absolutePath(raw, cwd);
    const lines = editLines(obj);
    if (filePath && lines > 0) {
      files.push({ path: filePath, lines });
    }
  }
  for (const [key, value] of Object.entries(obj)) {
    if (SKIP_WALK.has(key) || !value || typeof value !== "object") {
      continue;
    }
    collectEdits(value, cwd, files, depth + 1);
  }
}

function editLines(obj: Record<string, unknown>): number {
  const oldText = typeof obj.old_string === "string" ? obj.old_string : "";
  const newText = typeof obj.new_string === "string" ? obj.new_string : "";
  if (oldText.length > 0 || newText.length > 0) {
    return lineCount(oldText) + lineCount(newText);
  }
  if (typeof obj.content === "string") {
    return lineCount(obj.content);
  }
  return 0;
}

function lineCount(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      count++;
    }
  }
  if (text.endsWith("\n")) {
    count--;
  }
  return count;
}

function absolutePath(filePath: string, cwd: string | undefined): string | null {
  if (filePath.startsWith("/")) {
    return filePath;
  }
  if (!cwd) {
    return null;
  }
  const slash = cwd.endsWith("/") ? "" : "/";
  return `${cwd}${slash}${filePath}`;
}

function stringField(obj: Record<string, unknown>, key: string): string | null {
  return typeof obj[key] === "string" ? obj[key] : null;
}
