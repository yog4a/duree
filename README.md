# ⏱️ Durée

🔒 A fully local alternative. The code is short enough to review with an AI and confirm there is no backdoor and nothing that spies on what you type. Everything stays on this machine.

A Cursor extension that tracks coding time **on the machine where the folder is open**.

Each day is its own file in `~/.duree/days/`. Nothing is deleted, and nothing is sent over the network.

## ✨ What you see

The status bar shows a watch icon and today's time.

Open the command palette and run **Durée: Today** for the full day, or **Durée: History** for every saved day:

- 📁 projects
- 🗣️ languages
- 🏷️ categories
- 🌿 branches
- 📄 files
- 💻 editors, systems, and machines
- 🤖 human lines, AI lines, and tokens

Activity in a file is recorded at most once every **2 minutes**. A save is always recorded. A pause longer than **15 minutes** ends the session. The characters you type are not stored.

## 📝 What is stored

Each heartbeat keeps:

| Field    | Examples                                                          |
| -------- | ----------------------------------------------------------------- |
| File     | absolute path, cursor line and column, line count                 |
| Place    | `owner/repo`, or the folder path when the repo has no remote       |
| Activity | `coding`, `ai coding`, `debugging`, `building`, `code reviewing`  |
| Machine  | hostname, editor, OS                                              |
| AI       | session, input tokens, output tokens, prompt length, line changes |

Dependencies are read from the open file for JavaScript, TypeScript, Python, Go, Rust, and `package.json`.

AI activity is read from `~/.claude`, `~/.codex`, and Cursor transcripts. The first pass skips history that is already on disk.

🔒 The log does **not** contain file text or prompt text.

## 🚀 Install

Open the machine in Cursor once. In that machine's terminal:

```bash
git clone --depth 1 https://github.com/yog4a/duree.git
cd duree
npm install
npm run install-cursor
```

That builds `duree-0.5.0.vsix` and installs it with `cursor --install-extension`. Then **Developer: Reload Window**.

## 📦 Install from a VSIX

Build the package:

```bash
npm run package
```

The file is `duree-0.5.0.vsix` in this folder. The name follows the release version. Copy it to the other machine and, in Cursor's terminal:

```bash
cursor --install-extension duree-0.5.0.vsix
```

Then **Developer: Reload Window**. No clone and no build on that machine.

Each day is kept as `~/.duree/days/YYYY-MM-DD.jsonl`. Another computer keeps its own files.

## 🛠️ Development

Node.js and npm.

```bash
npm install
npm test
npm run lint
npm run build
```
