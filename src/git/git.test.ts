import assert from "node:assert/strict";
import test from "node:test";
import { projectName, repoSlug } from "./git.repo";

test("a github url becomes owner/repo", () => {
  assert.equal(repoSlug("https://github.com/yog4a/duree"), "yog4a/duree");
  assert.equal(repoSlug("https://github.com/yog4a/duree.git"), "yog4a/duree");
  assert.equal(repoSlug("git@github.com:yog4a/duree.git"), "yog4a/duree");
  assert.equal(repoSlug("ssh://git@github.com/yog4a/duree.git"), "yog4a/duree");
});

test("a remote without owner and repo is ignored", () => {
  assert.equal(repoSlug(""), null);
  assert.equal(repoSlug("https://github.com/duree"), null);
});

test("project name uses the slug, then the full folder path", () => {
  assert.equal(projectName("/home/yogaa/development/codetime", "https://github.com/yog4a/duree"), "yog4a/duree");
  assert.equal(projectName("/home/yogaa/development/codetime", null), "/home/yogaa/development/codetime");
});
