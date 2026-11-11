import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { projectName } from "../git/git.repo";

type NamedBeat = {
  entity: string;
  project: string;
  projectRootCount?: number;
};

export function projectFromBeat(beat: NamedBeat, home: string): string {
  const file = absoluteEntity(beat.entity, beat.project, home);
  const root = (file ? findGitRoot(file) : null) ?? rootFromCount(beat.entity, beat.projectRootCount ?? 0);
  if (!root) {
    return beat.project;
  }
  return projectName(root, remoteOf(root));
}

function absoluteEntity(entity: string, project: string, home: string): string | null {
  if (path.isAbsolute(entity)) {
    return entity;
  }
  if (project.length === 0 || project.includes("/") || project.includes("\\")) {
    return null;
  }
  return path.join(path.dirname(home), project, entity);
}

function rootFromCount(entity: string, count: number): string | null {
  if (!path.isAbsolute(entity) || count <= 1) {
    return null;
  }
  const parts = entity.split(path.sep);
  if (parts.length < count) {
    return null;
  }
  const root = parts.slice(0, count).join(path.sep);
  if (!path.isAbsolute(root) || root === path.parse(root).root) {
    return null;
  }
  return root;
}

function findGitRoot(file: string): string | null {
  let dir = path.dirname(path.resolve(file));
  const stop = path.parse(dir).root;
  while (dir !== stop) {
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

function remoteOf(root: string): string | null {
  if (!fs.existsSync(root)) {
    return null;
  }
  try {
    const output = execFileSync("git", ["-C", root, "remote", "get-url", "origin"], {
      encoding: "utf8",
      timeout: 1500,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return output.length > 0 ? output : null;
  } catch {
    return null;
  }
}
