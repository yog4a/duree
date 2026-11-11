export function addPythonDependencies(source: string, names: Set<string>): void {
  for (const match of source.matchAll(/^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+/gm)) {
    addPythonModule(match[1], names);
  }
  for (const match of source.matchAll(/^\s*import\s+([A-Za-z0-9_., \t]+)/gm)) {
    for (const part of match[1].split(",")) {
      const moduleName = part.trim().split(/\s+/)[0];
      if (moduleName) {
        addPythonModule(moduleName, names);
      }
    }
  }
}

function addPythonModule(moduleName: string, names: Set<string>): void {
  if (moduleName.startsWith(".")) {
    return;
  }
  const root = moduleName.split(".")[0];
  if (root) {
    names.add(root);
  }
}
