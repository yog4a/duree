import { execFileSync } from "node:child_process";

export type GitInfo = {
  root: string | null;
  branch: string | null;
  remote: string | null;
};

const CACHE_MS = 30_000;
const cache = new Map<string, GitInfo & { at: number }>();

export function gitInfo(dir: string, now = Date.now()): GitInfo {
  const cached = cache.get(dir);
  if (cached && now - cached.at < CACHE_MS) {
    return cached;
  }
  const info = readGit(dir);
  cache.set(dir, { ...info, at: now });
  return info;
}

function readGit(dir: string): GitInfo {
  try {
    const root = git(dir, ["rev-parse", "--show-toplevel"]);
    const branch = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    return { root, branch, remote: readRemote(dir) };
  } catch {
    return { root: null, branch: null, remote: null };
  }
}

function readRemote(dir: string): string | null {
  try {
    return git(dir, ["remote", "get-url", "origin"]);
  } catch {
    return null;
  }
}

function git(dir: string, args: string[]): string | null {
  const output = execFileSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    timeout: 1500,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  return output.length > 0 ? output : null;
}
