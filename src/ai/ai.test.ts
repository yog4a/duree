import assert from "node:assert/strict";
import test from "node:test";
import { parseAiLine, tailStart } from "./ai";
import { assignAi } from "./ai.assign";

test("claude edit keeps tokens, line counts, and drops the prompt text", () => {
  const line = JSON.stringify({
    type: "assistant",
    sessionId: "sess",
    cwd: "/work/app",
    message: {
      usage: { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 3, cache_creation_input_tokens: 2 },
      content: [
        {
          type: "tool_use",
          name: "Edit",
          input: {
            file_path: "/work/app/src/a.ts",
            old_string: "a\nb\n",
            new_string: "a\nb\nc\n",
          },
        },
      ],
    },
  });
  const event = parseAiLine(line);
  assert.ok(event);
  assert.equal(event.session, "sess");
  assert.equal(event.inputTokens, 15);
  assert.equal(event.outputTokens, 4);
  assert.deepEqual(event.files, [{ path: "/work/app/src/a.ts", lines: 5 }]);
  assert.equal(JSON.stringify(event).includes("a\\nb"), false);
});

test("user prompt length is kept and the prompt text is not", () => {
  const event = parseAiLine(
    JSON.stringify({
      type: "user",
      sessionId: "sess",
      message: { role: "user", content: [{ type: "text", text: "SECRET_PROMPT" }] },
    }),
  );
  assert.ok(event);
  assert.equal(event.promptLength, "SECRET_PROMPT".length);
  assert.equal(JSON.stringify(event).includes("SECRET_PROMPT"), false);
});

test("a read tool is not an edit", () => {
  const event = parseAiLine(
    JSON.stringify({
      type: "assistant",
      sessionId: "sess",
      message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "/work/app/src/a.ts" } }] },
    }),
  );
  assert.equal(event, null);
});

test("codex token events use the last turn, not the cumulative total", () => {
  const event = parseAiLine(
    JSON.stringify({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { input_tokens: 100, output_tokens: 50 },
          last_token_usage: { input_tokens: 5, output_tokens: 2 },
        },
      },
    }),
    "/home/yogaa/.codex/sessions/rollout-01a1cb0c-8a8a-78e3-b46f-26ec59e387bb.jsonl",
  );
  assert.ok(event);
  assert.equal(event.inputTokens, 5);
  assert.equal(event.outputTokens, 2);
  assert.equal(event.session, "01a1cb0c-8a8a-78e3-b46f-26ec59e387bb");
});

test("tokens attach to the first edited file, loose prompts attach to the open file", () => {
  const assigned = assignAi(
    [
      {
        session: "sess",
        inputTokens: 8,
        outputTokens: 2,
        promptLength: 4,
        plan: "pro",
        files: [
          { path: "/work/a.ts", lines: 3 },
          { path: "/work/b.ts", lines: 1 },
        ],
      },
      {
        session: "sess",
        inputTokens: 1,
        outputTokens: 0,
        promptLength: 6,
        plan: null,
        files: [],
      },
    ],
    "/work/a.ts",
  );
  assert.equal(assigned.get("/work/a.ts")?.inputTokens, 9);
  assert.equal(assigned.get("/work/a.ts")?.promptLength, 10);
  assert.equal(assigned.get("/work/a.ts")?.lines, 3);
  assert.equal(assigned.get("/work/a.ts")?.plan, "pro");
  assert.equal(assigned.get("/work/b.ts")?.inputTokens, 0);
  assert.equal(assigned.get("/work/b.ts")?.lines, 1);
});

test("a log seen for the first time is not replayed", () => {
  assert.equal(tailStart(100, undefined), 100);
  assert.equal(tailStart(100, 40), 40);
  assert.equal(tailStart(10, 40), 0);
});
