export function addJsDependencies(source: string, names: Set<string>): void {
  const patterns = [
    /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const name = packageName(match[1]);
      if (name) {
        names.add(name);
      }
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
    if (!scope || !name) {
      return null;
    }
    return `${scope}/${name}`;
  }
  return value.split("/")[0] || null;
}
