import { MAX_LINE_CHARS } from "./ai.constants";
import { collectEdits } from "./ai.edits";
import { asRecord, num, planOf, sessionFromPath, sessionOf, textLength } from "./ai.helpers";

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

/** Pull counters and edited paths out of one transcript line. Prompt text is counted, then dropped. */
export function parseAiLine(line: string, sourcePath = ""): AiEvent | null {
  if (line.length > MAX_LINE_CHARS) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
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
  if (obj.type === "user" || obj.role === "user") {
    event.promptLength += textLength(message ?? obj.message);
  }

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

export function tailStart(size: number, stored: number | undefined): number {
  if (stored === undefined) {
    return size;
  }
  if (stored > size) {
    return 0;
  }
  return stored;
}
