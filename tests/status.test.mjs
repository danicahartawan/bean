import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const appUrl = pathToFileURL(path.resolve(import.meta.dirname, "..", "app.js"));

test("note status moves from shimmer through thinking states to saved", async () => {
  const app = await import(`${appUrl.href}?test=${Date.now()}`).catch(() => null);

  assert.ok(app, "app.js should export the note status behavior");
  assert.equal(typeof app.getNoteStatus, "function");

  const cases = [
    { value: "", elapsedMs: 0, expected: { phase: "idle", label: "" } },
    { value: "   ", elapsedMs: 900, expected: { phase: "idle", label: "" } },
    { value: "Follow up with Jack", elapsedMs: 0, expected: { phase: "shimmer", label: "Thinking…" } },
    { value: "Follow up with Jack", elapsedMs: 450, expected: { phase: "thinking", label: "Finding context" } },
    { value: "Follow up with Jack", elapsedMs: 950, expected: { phase: "thinking", label: "Saving note" } },
    { value: "Follow up with Jack", elapsedMs: 1_450, expected: { phase: "done", label: "✦ Saved" } },
  ];

  for (const { value, elapsedMs, expected } of cases) {
    assert.deepEqual(app.getNoteStatus(value, elapsedMs), expected);
  }
});
