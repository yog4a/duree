# ⏱️ Durée

A Cursor extension that tracks coding time **on the machine where the folder is open**.

The log stays in `~/.duree/heartbeats.jsonl`. Nothing is sent over the network.

It can run next to WakaTime. It does not replace it.

## ✨ What you see

The status bar shows a watch icon and today's time.

Open the command palette and run **Durée: aujourd'hui** for the full day:

- 📁 projects
- 🗣️ languages
- 🏷️ categories
- 🌿 branches
- 📄 files
- 💻 editors, systems, and machines
- 🤖 human lines, AI lines, and tokens

A keystroke is recorded at most once every **2 minutes** per file. A save is always recorded. A pause longer than **15 minutes** ends the session.

## 📝 What is stored

Each heartbeat keeps:

| Field | Examples |
| --- | --- |
| File | absolute path, cursor line and column, line count |
| Place | project, git branch, language |
| Activity | `coding`, `ai coding`, `debugging`, `building`, `code reviewing` |
| Machine | hostname, editor, OS |
| AI | session, input tokens, output tokens, prompt length, line changes |

Dependencies are read from the open file for JavaScript, TypeScript, Python, Go, Rust, and `package.json`.

AI activity is read from `~/.claude`, `~/.codex`, and Cursor transcripts. The first pass skips history that is already on disk.

🔒 The log does **not** contain file text or prompt text.

## 🚀 Install

Open the machine in Cursor once so `~/.cursor-server` exists. Then:

```bash
git clone https://github.com/yog4a/duree.git
cd duree
npm install
npm run build
DEST="$HOME/.cursor-server/extensions/yogaa.duree-0.3.0"
mkdir -p "$DEST/dist"
cp package.json "$DEST/package.json"
find dist -name '*.js' ! -name '*.test.js' -exec cp {} "$DEST/dist/" \;
```

In Cursor, on that machine: **Developer: Reload Window**.

The log for that machine is `~/.duree/heartbeats.jsonl`. Another computer keeps its own. An old `~/.codetime` folder is renamed to `~/.duree` on first launch.

## 🛠️ Development

Node.js and npm.

```bash
npm install
npm test
npm run build
```
