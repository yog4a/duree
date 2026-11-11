import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeVsix } from "./vsix.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const id = `${pkg.publisher}.${pkg.name}`;
const folderName = `${id}-${pkg.version}`;
const built = join(root, "dist", "extension", "extension.js");

function copyBuilt(from, to) {
  for (const name of readdirSync(from)) {
    const source = join(from, name);
    if (statSync(source).isDirectory()) {
      copyBuilt(source, join(to, name));
      continue;
    }
    if (name.endsWith(".js") && !name.endsWith(".test.js")) {
      mkdirSync(to, { recursive: true });
      cpSync(source, join(to, name));
    }
  }
}

if (!existsSync(built)) {
  console.error("dist/extension/extension.js is missing. Run npm run build first.");
  process.exit(1);
}

const vsix = join(root, "duree.vsix");
writeVsix(root, vsix);
const cursor = cursorBin();
if (cursor && installWithCursor(cursor, vsix)) {
  console.log(vsix);
  process.exit(0);
}

const extensionDirs = [join(homedir(), ".cursor-server", "extensions"), join(homedir(), ".cursor", "extensions")].filter((dir) => existsSync(dir));

if (extensionDirs.length === 0) {
  console.error("No Cursor extensions folder. Open this machine in Cursor once, then rerun.");
  process.exit(1);
}

for (const extensionsDir of extensionDirs) {
  const dest = join(extensionsDir, folderName);
  mkdirSync(join(dest, "dist"), { recursive: true });
  cpSync(join(root, "package.json"), join(dest, "package.json"));
  copyBuilt(join(root, "dist"), join(dest, "dist"));

  for (const name of readdirSync(extensionsDir)) {
    if (!name.startsWith(`${id}-`) || name === folderName || name.endsWith(".off")) {
      continue;
    }
    const from = join(extensionsDir, name);
    let parked = `${from}.off`;
    let n = 2;
    while (existsSync(parked)) {
      parked = `${from}.off${n++}`;
    }
    renameSync(from, parked);
  }

  const registryPath = join(extensionsDir, "extensions.json");
  const list = existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, "utf8")) : [];
  if (!Array.isArray(list)) {
    throw new Error(`${registryPath} is not a list`);
  }
  const next = list.filter((entry) => entry?.identifier?.id !== id && entry?.identifier?.id !== "yogaa.codetime");
  next.push({
    identifier: { id },
    version: pkg.version,
    location: { $mid: 1, path: dest, scheme: "file" },
    relativeLocation: folderName,
    metadata: {
      isApplicationScoped: false,
      isMachineScoped: true,
      isBuiltin: false,
      installedTimestamp: Date.now(),
      pinned: true,
      source: "vsix",
      targetPlatform: "universal",
      updated: false,
      private: false,
      isPreReleaseVersion: false,
      hasPreReleaseVersion: false,
      preRelease: false
    }
  });
  writeFileSync(registryPath, JSON.stringify(next));
  console.log(dest);
}

function installWithCursor(bin, file) {
  spawnSync(bin, ["--uninstall-extension", id], { encoding: "utf8", timeout: 20_000 });
  const install = spawnSync(bin, ["--install-extension", file, "--force"], { encoding: "utf8", timeout: 20_000 });
  if (install.stdout) {
    console.log(install.stdout.trim());
  }
  if (install.status !== 0) {
    if (install.stderr) {
      console.error(install.stderr.trim());
    }
    return false;
  }
  return true;
}

function cursorBin() {
  const found = [];
  const onPath = spawnSync("which", ["cursor"], { encoding: "utf8" });
  if (onPath.status === 0 && onPath.stdout.trim()) {
    found.push(onPath.stdout.trim());
  }
  const base = join(homedir(), ".cursor-server", "bin");
  if (existsSync(base)) {
    for (const platform of readdirSync(base)) {
      const platformDir = join(base, platform);
      if (!statSync(platformDir).isDirectory()) {
        continue;
      }
      for (const commit of readdirSync(platformDir)) {
        const bin = join(join(platformDir, commit, "bin", "remote-cli"), "cursor");
        if (existsSync(bin)) {
          found.push(bin);
        }
      }
    }
  }
  found.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return found[0];
}
