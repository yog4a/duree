import assert from "node:assert/strict";
import test from "node:test";
import { dependenciesFromSource } from "./dependencies";

test("javascript dependencies keep package names and drop relative imports", () => {
  const source = `
    import express from "express";
    import { readFile } from "node:fs";
    import { z } from "@scope/pkg/sub";
    import local from "./local";
    const lodash = require("lodash/get");
    export { a } from "zod";
  `;
  assert.deepEqual(dependenciesFromSource("typescript", source), [
    "@scope/pkg",
    "express",
    "lodash",
    "zod",
  ]);
});

test("python, go, and rust dependencies use the module root", () => {
  assert.deepEqual(
    dependenciesFromSource("python", "import os, sys\nfrom urllib.parse import urlparse\n"),
    ["os", "sys", "urllib"],
  );
  assert.deepEqual(
    dependenciesFromSource("go", 'import "fmt"\nimport (\n\t"github.com/foo/bar"\n)\n'),
    ["fmt", "github.com/foo/bar"],
  );
  assert.deepEqual(
    dependenciesFromSource("rust", "use std::io;\nuse serde::Deserialize;\n"),
    ["serde"],
  );
});

test("package.json contributes dependency names", () => {
  const source = JSON.stringify({
    dependencies: { typescript: "5.0.0" },
    devDependencies: { vitest: "1.0.0" },
  });
  assert.deepEqual(dependenciesFromSource("json", source), ["typescript", "vitest"]);
});
