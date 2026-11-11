import type { Summary } from "./heartbeat.types";

export function ranked(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function renderToday(summary: Summary): string {
  const lines = [`Today: ${formatDuration(summary.total)}`, ""];
  const sections: [string, Map<string, number>, number][] = [
    ["Projects", summary.byProject, 20],
    ["Languages", summary.byLanguage, 20],
    ["Categories", summary.byCategory, 20],
    ["Branches", summary.byBranch, 20],
    ["Files", summary.byEntity, 15],
    ["Editors", summary.byEditor, 10],
    ["Systems", summary.byOs, 10],
    ["Machines", summary.byMachine, 10],
  ];
  for (const [title, map, limit] of sections) {
    lines.push(title);
    const rows = ranked(map).slice(0, limit);
    if (rows.length === 0) {
      lines.push("  —");
    }
    for (const [name, seconds] of rows) {
      const share = summary.total > 0 ? Math.round((seconds / summary.total) * 100) : 0;
      lines.push(`  ${name}: ${formatDuration(seconds)} (${share}%)`);
    }
    lines.push("");
  }
  lines.push("Activity");
  lines.push(`  human lines: ${summary.humanLineChanges}`);
  lines.push(`  AI lines: ${summary.aiLineChanges}`);
  lines.push(`  input tokens: ${summary.aiInputTokens}`);
  lines.push(`  output tokens: ${summary.aiOutputTokens}`);
  lines.push(`  prompt length: ${summary.aiPromptLength}`);
  lines.push("", "Today's file: ~/.duree/days/");
  return lines.join("\n");
}

export function renderHistory(days: { day: string; total: number }[]): string {
  const lines = ["History", ""];
  const sorted = [...days].sort((a, b) => b.day.localeCompare(a.day));
  if (sorted.length === 0) {
    lines.push("No days yet.");
  }
  let sum = 0;
  for (const row of sorted) {
    sum += row.total;
    lines.push(`${row.day}: ${formatDuration(row.total)}  ~/.duree/days/${row.day}.jsonl`);
  }
  lines.push("", `Total: ${formatDuration(sum)}`);
  lines.push("Day files in days/ are kept.");
  return lines.join("\n");
}

export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
