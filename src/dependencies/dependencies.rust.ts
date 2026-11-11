import { RUST_SKIP } from "./dependencies.constants";

export function addRustDependencies(source: string, names: Set<string>): void {
  for (const match of source.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+([A-Za-z0-9_]+)/gm)) {
    if (!RUST_SKIP.has(match[1])) {
      names.add(match[1]);
    }
  }
}
