const JS = new Set([
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "vue",
  "svelte",
]);

const DEPENDENCY_KEYS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

/** Package names only. Relative imports and the source itself are dropped. */
export function dependenciesFromSource(languageId: string, source: string): string[] {
  const names = new Set<string>();
  if (languageId === "json") addJsonDependencies(source, names);
  else if (JS.has(languageId)) addJsDependencies(source, names);
  else if (languageId === "python") addPythonDependencies(source, names);
  else if (languageId === "go") addGoDependencies(source, names);
  else if (languageId === "rust") addRustDependencies(source, names);
  return [...names].sort().slice(0, 100);
}

function addJsDependencies(source: string, names: Set<string>): void {
  const patterns = [
    /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const name = packageName(match[1]);
      if (name) names.add(name);
    }
  }
}

function packageName(specifier: string): string | null {
  const value = specifier.trim();
  if (value.length === 0 || value.startsWith(".") || value.startsWith("/") || value.startsWith("node:")) {
    return null;
  }
  if (value.startsWith("@")) {
    const [scope, name] = value.split("/");
    if (!scope || !name) return null;
    return `${scope}/${name}`;
  }
  return value.split("/")[0] || null;
}

function addPythonDependencies(source: string, names: Set<string>): void {
  for (const match of source.matchAll(/^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+/gm)) {
    addPythonModule(match[1], names);
  }
  for (const match of source.matchAll(/^\s*import\s+([A-Za-z0-9_., \t]+)/gm)) {
    for (const part of match[1].split(",")) {
      const moduleName = part.trim().split(/\s+/)[0];
      if (moduleName) addPythonModule(moduleName, names);
    }
  }
}

function addPythonModule(moduleName: string, names: Set<string>): void {
  if (moduleName.startsWith(".")) return;
  const root = moduleName.split(".")[0];
  if (root) names.add(root);
}

function addGoDependencies(source: string, names: Set<string>): void {
  for (const match of source.matchAll(/import\s+(?:\w+\s+)?"([^"]+)"/g)) names.add(match[1]);
  for (const block of source.matchAll(/import\s*\(([\s\S]*?)\)/g)) {
    for (const match of block[1].matchAll(/"([^"]+)"/g)) names.add(match[1]);
  }
}

function addRustDependencies(source: string, names: Set<string>): void {
  const skip = new Set(["std", "core", "alloc", "crate", "self", "super"]);
  for (const match of source.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+([A-Za-z0-9_]+)/gm)) {
    if (!skip.has(match[1])) names.add(match[1]);
  }
}

function addJsonDependencies(source: string, names: Set<string>): void {
  if (source.length > 500_000) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object") return;
  const manifest = parsed as Record<string, unknown>;
  for (const key of DEPENDENCY_KEYS) {
    const value = manifest[key];
    if (!value || typeof value !== "object") continue;
    for (const name of Object.keys(value)) names.add(name);
  }
}
