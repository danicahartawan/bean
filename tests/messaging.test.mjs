import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = file => readFile(path.join(root, file), "utf8");

test("messaging page boots its script inside the phone", async () => {
  const html = await read("messaging/index.html");
  assert.match(html, /id="thread"/);
  assert.match(html, /id="field-text"/);
  assert.match(html, /<script type="module" src="\.\/messaging\.js"><\/script>/);
  for (const label of ["Back to conversations", "Send"]) assert.match(html, new RegExp(`aria-label="${label}"`));
});

test("demo asks @forecasting for this month's sales and answers from the Month view", async () => {
  const js = await read("messaging/messaging.js");
  assert.match(js, /const MENTION = 'forecasting'/);
  assert.match(js, /const QUESTION = 'what is the expected sales this month'/);
  for (const value of ["313400", "94900", "60600"]) assert.match(js, new RegExp(value));
  assert.match(js, /forecasting\.html#sales/);
});

test("messaging is part of the production build", async () => {
  const config = await read("vite.config.js");
  assert.match(config, /messaging: resolve\(__dirname, "messaging\/index\.html"\)/);
});
