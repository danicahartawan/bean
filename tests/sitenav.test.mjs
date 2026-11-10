import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = file => readFile(path.join(root, file), "utf8");
const PAGES = ["index.html", "new/index.html", "forecasting.html", "bookkeeper/index.html", "messaging/index.html"];

test("every page loads the tab bar", async () => {
  for (const page of PAGES) {
    assert.match(await read(page), /<script type="module" src="\/src\/sitenav\.js"><\/script>/, page);
  }
});

test("tab bar has Home, Agent, Artifacts, Forecasting, Import and Mobile with their pages", async () => {
  const js = await read("src/sitenav.js");
  for (const label of ["Home", "Agent", "Artifacts", "Forecasting", "Import", "Mobile",
    "Profit & Loss", "Cash Reconciliation", "Income & Expense Ledger", "Bookkeeper Package",
    "Sales", "Product Trends", "Depreciation", "Laundry Log", "Messaging"]) {
    assert.ok(js.includes(`label: '${label}'`), label);
  }
  for (const href of ["'/new/'", "'/new/#agent'", "'/bookkeeper/#sheet=pnl'", "'/bookkeeper/#sheet=recon'", "'/bookkeeper/#sheet=ledger'",
    "'/bookkeeper/#sheet=journal'", "'/forecasting.html'", "'/forecasting.html#products'", "'/forecasting.html#depreciation'", "'/'", "'/messaging/'"]) {
    assert.ok(js.includes(`href: ${href}`), href);
  }
});

test("tab bar stays out of embedded frames", async () => {
  const js = await read("src/sitenav.js");
  assert.match(js, /window\.self !== window\.top/);
});

test("/new/#agent opens the agent chat", async () => {
  assert.match(await read("new/new.js"), /location\.hash === "#agent"/);
});
