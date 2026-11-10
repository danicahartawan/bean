import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("serves the Laundry Log note inside the phone", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const visibleCopy = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  assert.match(visibleCopy, /Mon 9\/11 Laundry Log/);
});

test("exposes the visible controls with accessible names", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");

  for (const label of ["Go back", "Share note", "More options"]) {
    assert.match(html, new RegExp(`aria-label="${label}"`));
  }
});

test("provides an editable note row with a live AI status region", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");

  assert.match(html, /<textarea[^>]+id="live-note-input"[^>]+aria-describedby="live-note-help"/);
  assert.match(html, /class="[^"]*t-shimmer[^"]*"/);
  assert.match(html, /class="t-think" role="status"/);
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
});

test("boots the avatar quick-actions island inside the phone screen", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");

  assert.match(html, /<div[^>]+id="bot-avatar-menu-root"/);
  assert.match(html, /<script[^>]+type="module"[^>]+src="\.\/src\/main\.jsx"/);
});
