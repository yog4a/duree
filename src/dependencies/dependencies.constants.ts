export const JS_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "vue",
  "svelte",
]);

export const DEPENDENCY_KEYS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

export const RUST_SKIP = new Set(["std", "core", "alloc", "crate", "self", "super"]);

export const MAX_DEPENDENCIES = 100;
export const MAX_JSON_CHARS = 500_000;
