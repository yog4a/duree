export type AiEvent = {
  session: string | null;
  inputTokens: number;
  outputTokens: number;
  promptLength: number;
  plan: string | null;
  files: { path: string; lines: number }[];
};

export type AiFileStats = {
  session: string | null;
  inputTokens: number;
  outputTokens: number;
  promptLength: number;
  plan: string | null;
  lines: number;
};

const SKIP_WALK = new Set([
  "old_string",
  "new_string",
  "content",
  "text",
  "command",
  "encrypted_content",
]);

export function emptyStats(): AiFileStats {
  return {
    session: null,
    inputTokens: 0,
    outputTokens: 0,
    promptLength: 0,
    plan: null,
    lines: 0,
  };
}

/** Pull counters and edited paths out of one transcript line. Prompt text is counted, then dropped. */
export function parseAiLine(line: string, sourcePath = ""): AiEvent | null {
  if (line.length > 1_500_000) return null;
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const message = asRecord(obj.message);
  const event: AiEvent = {
    session: sessionOf(obj) ?? sessionFromPath(sourcePath),
    inputTokens: 0,
    outputTokens: 0,
    promptLength: 0,
    plan: planOf(obj),
    files: [],
  };

  const usage = message ? asRecord(message.usage) : undefined;
  if (usage) {
    event.inputTokens +=
      num(usage.input_tokens) + num(usage.cache_read_input_tokens) + num(usage.cache_creation_input_tokens);
    event.outputTokens += num(usage.output_tokens);
  }
  if (obj.type === "user" || obj.role === "user") event.promptLength += textLength(message ?? obj.message);

  const payload = asRecord(obj.payload);
  if (payload?.type === "token_count") {
    const info = asRecord(payload.info);
    const last = info ? asRecord(info.last_token_usage) : undefined;
    if (last) {
      event.inputTokens += num(last.input_tokens);
      event.outputTokens += num(last.output_tokens);
    }
  }

  const cwd = typeof obj.cwd === "string" ? obj.cwd : undefined;
  collectEdits(message?.content, cwd, event.files, 0);
  collectEdits(payload, cwd, event.files, 0);

  if (
    event.inputTokens === 0 &&
    event.outputTokens === 0 &&
    event.promptLength === 0 &&
    event.plan === null &&
    event.files.length === 0
  ) {
    return null;
  }
  return event;
}

/** Tokens stay on the first file of an event so one reply is not counted once per file. */
export function assignAi(events: AiEvent[], currentFile: string | null): Map<string, AiFileStats> {
  const byFile = new Map<string, AiFileStats>();
  const loose: AiEvent[] = [];
  for (const event of events) {
    if (event.files.length === 0) {
      loose.push(event);
      continue;
    }
    const primary = event.files[0].path;
    for (const file of event.files) {
      const stats = byFile.get(file.path) ?? emptyStats();
      stats.lines += file.lines;
      stats.session = event.session ?? stats.session;
      stats.plan = event.plan ?? stats.plan;
      if (file.path === primary) {
        stats.inputTokens += event.inputTokens;
        stats.outputTokens += event.outputTokens;
        stats.promptLength += event.promptLength;
      }
      byFile.set(file.path, stats);
    }
  }
  if (currentFile) {
    for (const event of loose) {
      const stats = byFile.get(currentFile) ?? emptyStats();
      stats.inputTokens += event.inputTokens;
      stats.outputTokens += event.outputTokens;
      stats.promptLength += event.promptLength;
      stats.session = event.session ?? stats.session;
      stats.plan = event.plan ?? stats.plan;
      byFile.set(currentFile, stats);
    }
  }
  return byFile;
}

export function tailStart(size: number, stored: number | undefined): number {
  if (stored === undefined) return size;
  if (stored > size) return 0;
  return stored;
}

function collectEdits(
  node: unknown,
  cwd: string | undefined,
  files: { path: string; lines: number }[],
  depth: number,
): void {
  if (depth > 6 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectEdits(item, cwd, files, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  const raw = stringField(obj, "file_path") ?? stringField(obj, "filePath") ?? stringField(obj, "target_file");
  const edited =
    typeof obj.old_string === "string" || typeof obj.new_string === "string" || typeof obj.content === "string";
  if (raw && edited) {
    const filePath = absolutePath(raw, cwd);
    const lines = editLines(obj);
    if (filePath && lines > 0) files.push({ path: filePath, lines });
  }
  for (const [key, value] of Object.entries(obj)) {
    if (SKIP_WALK.has(key) || !value || typeof value !== "object") continue;
    collectEdits(value, cwd, files, depth + 1);
  }
}

function editLines(obj: Record<string, unknown>): number {
  const oldText = typeof obj.old_string === "string" ? obj.old_string : "";
  const newText = typeof obj.new_string === "string" ? obj.new_string : "";
  if (oldText.length > 0 || newText.length > 0) return lineCount(oldText) + lineCount(newText);
  if (typeof obj.content === "string") return lineCount(obj.content);
  return 0;
}

function lineCount(text: string): number {
  if (text.length === 0) return 0;
  let count = 1;
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") count++;
  if (text.endsWith("\n")) count--;
  return count;
}

function absolutePath(filePath: string, cwd: string | undefined): string | null {
  if (filePath.startsWith("/")) return filePath;
  if (!cwd) return null;
  const slash = cwd.endsWith("/") ? "" : "/";
  return `${cwd}${slash}${filePath}`;
}

function sessionOf(obj: Record<string, unknown>): string | null {
  if (typeof obj.sessionId === "string") return obj.sessionId;
  const payload = asRecord(obj.payload);
  if (!payload) return null;
  if (typeof payload.session_id === "string") return payload.session_id;
  if (typeof payload.thread_id === "string") return payload.thread_id;
  return null;
}

function sessionFromPath(filePath: string): string | null {
  const match = filePath.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

function planOf(obj: Record<string, unknown>): string | null {
  const payload = asRecord(obj.payload);
  const candidates = [obj.subscription, obj.subscription_plan, obj.subscriptionPlan, payload?.subscription];
  for (const candidate of candidates) {
    const plan = shortPlan(candidate);
    if (plan) return plan;
  }
  return null;
}

function shortPlan(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0 && value.length <= 40 && !value.includes(" ")) return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["plan", "name", "subscriptionType"]) {
    const inner = record[key];
    if (typeof inner === "string" && inner.length > 0 && inner.length <= 40 && !inner.includes(" ")) return inner;
  }
  return null;
}

function textLength(content: unknown): number {
  if (typeof content === "string") return content.length;
  if (Array.isArray(content)) {
    let total = 0;
    for (const part of content) total += textLength(part);
    return total;
  }
  if (!content || typeof content !== "object") return 0;
  const record = content as Record<string, unknown>;
  if (typeof record.text === "string") return record.text.length;
  if (record.content !== undefined && record.content !== content) return textLength(record.content);
  return 0;
}

function stringField(obj: Record<string, unknown>, key: string): string | null {
  return typeof obj[key] === "string" ? obj[key] : null;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}
