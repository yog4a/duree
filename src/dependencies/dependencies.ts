import { JS_LANGUAGES, MAX_DEPENDENCIES } from "./dependencies.constants";
import { addGoDependencies } from "./dependencies.go";
import { addJsDependencies } from "./dependencies.javascript";
import { addJsonDependencies } from "./dependencies.json";
import { addPythonDependencies } from "./dependencies.python";
import { addRustDependencies } from "./dependencies.rust";

/** Package names only. Relative imports and the source itself are dropped. */
export function dependenciesFromSource(languageId: string, source: string): string[] {
  const names = new Set<string>();
  if (languageId === "json") {
    addJsonDependencies(source, names);
  } else if (JS_LANGUAGES.has(languageId)) {
    addJsDependencies(source, names);
  } else if (languageId === "python") {
    addPythonDependencies(source, names);
  } else if (languageId === "go") {
    addGoDependencies(source, names);
  } else if (languageId === "rust") {
    addRustDependencies(source, names);
  }
  return [...names].sort().slice(0, MAX_DEPENDENCIES);
}
