import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = file => readFile(path.join(root, file), "utf8");

test("flow page has the five steps in order", async () => {
  const html = await read("flow/index.html");
  const steps = [...html.matchAll(/data-step="(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(steps, ["send", "check", "books", "agent", "text"]);
  assert.match(html, /<script type="module" src="\.\/flow\.js"><\/script>/);
  assert.match(html, /<script type="module" src="\/src\/sitenav\.js"><\/script>/);
});

test("step 1 is a copy of the phone note without the QR panel", async () => {
  const html = await read("flow/note.html");
  assert.match(html, /id="artifacts-toast"/);
  assert.match(html, /src="\.\/note\.js"/);
  assert.doesNotMatch(html, /import-demo|case-study-back|src="\.\/assets\//);
});

test("the original pages are not referenced as copies", async () => {
  const flow = await read("flow/flow.js");
  assert.match(flow, /'\.\/note\.html'/);
  assert.match(flow, /const TABLES = \[/);
});

test("step 2 checks the same evening slip numbers as the books", async () => {
  const js = await read("flow/check.js");
  for (const n of ["value: 180", "value: 25", "value: 15", "MORNING = 920"]) assert.ok(js.includes(n), n);
});

test("flow pages are part of the build", async () => {
  const config = await read("vite.config.js");
  for (const page of ["flow/index.html", "flow/note.html", "flow/check.html"]) assert.ok(config.includes(page), page);
});

test("flow features the agent chat and the text-message demo", async () => {
  const flow = await read("flow/flow.js");
  assert.match(flow, /\/new\/\?skip#agent/);
  assert.match(flow, /\/messaging\/\?fast/);
  assert.match(flow, /data-demo="forecast"/);
});

test("home page shows the walkthrough as a card and can play it on its own", async () => {
  const html = await read("new/index.html");
  assert.match(html, /data-frame="\.\.\/flow\/"/);
  assert.match(html, /<script src="\.\/demo\.js"><\/script>/);
  const demo = await read("new/demo.js");
  assert.match(demo, /flow-done/);
  assert.match(await read("flow/flow.js"), /postMessage\(\{ bean: 'flow-done' \}/);
});
