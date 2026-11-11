import { DEPENDENCY_KEYS, MAX_JSON_CHARS } from "./dependencies.constants";

export function addJsonDependencies(source: string, names: Set<string>): void {
  if (source.length > MAX_JSON_CHARS) {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object") {
    return;
  }
  const manifest = parsed as Record<string, unknown>;
  for (const key of DEPENDENCY_KEYS) {
    const value = manifest[key];
    if (!value || typeof value !== "object") {
      continue;
    }
    for (const name of Object.keys(value)) {
      names.add(name);
    }
  }
}
