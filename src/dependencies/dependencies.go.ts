export function addGoDependencies(source: string, names: Set<string>): void {
  for (const match of source.matchAll(/import\s+(?:\w+\s+)?"([^"]+)"/g)) {
    names.add(match[1]);
  }
  for (const block of source.matchAll(/import\s*\(([\s\S]*?)\)/g)) {
    for (const match of block[1].matchAll(/"([^"]+)"/g)) {
      names.add(match[1]);
    }
  }
}
