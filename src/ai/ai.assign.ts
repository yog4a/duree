import type { AiEvent, AiFileStats } from "./ai";

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

function emptyStats(): AiFileStats {
  return {
    session: null,
    inputTokens: 0,
    outputTokens: 0,
    promptLength: 0,
    plan: null,
    lines: 0,
  };
}
