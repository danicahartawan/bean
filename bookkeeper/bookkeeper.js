// Paradigm-style home for the bookkeeper package: three sheets, each opens as a grid.
const SHEETS = {
  pnl: {
    title: "Profit & Loss — Budget vs Actual",
    cols: ["Line item", "Category", "Daily budget", "Notebook (AM)", "Mon 9/11 slip (PM)", "Actual", "Variance", "% of budget", "Status"],
    types: ["text", "cat", "num", "num", "num", "num", "num", "num", "cat"],
    newCol: 4,
    signed: [6],
    attach: true,
    rows: [
      ["Washer collections", "Revenue", "$800", "$680", "+$180", "$860", "+$60", "108%", "Ahead"],
      ["Dryer collections", "Revenue", "$250", "$240", "+$25", "$265", "+$15", "106%", "Ahead"],
      ["Soap machine collections", "Revenue", "$20", "$0", "+$15", "$15", "−$5", "75%", "Behind"],
      ["Total revenue", "Total", "$1,070", "$920", "+$220", "$1,140", "+$70", "107%", "Ahead", "total"],
      ["Repairs — washer 6", "Expense", "$50", "$85", "$0", "$85", "−$35", "170%", "Over budget"],
      ["Detergent & supplies", "Expense", "$50", "$45", "$0", "$45", "+$5", "90%", "On budget"],
      ["Total expenses", "Total", "$100", "$130", "$0", "$130", "−$30", "130%", "Over budget", "total"],
      ["Net profit", "Profit", "$970", "$790", "+$220", "$1,010", "+$40", "104%", "Ahead", "total"],
    ],
  },
  recon: {
    title: "Cash Reconciliation",
    cols: ["Item", "Amount"],
    rows: [
      ["Original collections", "$920"],
      ["Evening collections", "+$220", "new"],
      ["Total collections", "$1,140", "total"],
      ["Cash expenses", "−$130"],
      ["Bank deposit", "−$690"],
      ["Change reserve", "−$100"],
      ["Cash remaining in safe", "$220", "total"],
    ],
  },
  ledger: {
    title: "Income & Expense Ledger",
    cols: ["Category", "Before", "After"],
    rows: [
      ["Washer collections", "$680", "$860", "new"],
      ["Dryer collections", "$240", "$265", "new"],
      ["Soap machine collections", "$0", "$15", "new"],
      ["Repair expense (washer 6)", "$85", "$85"],
      ["Detergent purchase", "$45", "$45"],
    ],
  },
  journal: {
    title: "Bookkeeper Package",
    cols: ["Account", "Debit", "Credit", "Source"],
    attach: true,
    rows: [
      ["Cash", "$1,140", "", "Collections, notebook + slip"],
      ["  Laundry revenue — washers", "", "$860", "Notebook + slip"],
      ["  Laundry revenue — dryers", "", "$265", "Notebook + slip"],
      ["  Laundry revenue — soap machine", "", "$15", "Evening slip", "new"],
      ["Repairs & maintenance", "$85", "", "Notebook"],
      ["Supplies — detergent", "$45", "", "Notebook"],
      ["  Cash", "", "$130", "Expenses paid in cash"],
      ["Bank account", "$690", "", "Notebook"],
      ["  Cash", "", "$690", "Deposit"],
      ["Change fund", "$100", "", "Notebook"],
      ["  Cash", "", "$100", "Kept for change"],
    ],
  },
};

const ORDER = ["pnl", "recon", "ledger", "journal"];
const $ = (sel) => document.querySelector(sel);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const isNum = (s) => /^[+−-]?\$?[\d,]+$/.test(s.trim());

const dots =
  '<span class="card__dots"><svg viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg></span>';

const person =
  '<svg viewBox="0 0 16 16"><circle cx="8" cy="6" r="2.5"/><path d="M3.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"/></svg>';

function thumb(sheet) {
  const widths = sheet.cols.length === 4 ? ["38%", "20%", "20%", "22%"] : sheet.cols.length === 3 ? ["52%", "24%", "24%"] : ["64%", "36%"];
  const head = `<tr>${sheet.cols.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
  const body = sheet.rows
    .slice(0, 8)
    .map((r) => `<tr>${sheet.cols.map((_, i) => `<td>${esc((r[i] || "").trim())}</td>`).join("")}</tr>`)
    .join("");
  return `<table class="mini"><colgroup>${widths.map((w) => `<col style="width:${w}">`).join("")}</colgroup>${head}${body}</table>`;
}

function cards(targetId) {
  $(targetId).innerHTML = ORDER.map((key) => {
    const s = SHEETS[key];
    return `<a class="card" data-sheet="${key}"><div class="card__thumb">${thumb(s)}</div><div class="card__meta"><b>${esc(s.title)}</b><span>${person}Danica Hartawan</span></div>${dots}</a>`;
  }).join("");
}

const TAGS = { Revenue: "green", Expense: "orange", Total: "blue", Profit: "purple", Ahead: "green", Behind: "yellow", "Over budget": "orange", "On budget": "blue" };
const ICONS = {
  text: '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M5 6h6M5 9h4"/></svg>',
  cat: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="m5.8 8.2 1.6 1.6 2.8-3"/></svg>',
  num: '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M6.5 5 6 11M10 5l-.5 6M4.8 7h6.4M4.5 9.5h6.4"/></svg>',
};

function openSheet(key) {
  const s = SHEETS[key];
  if (!s) return;
  const types = s.types || s.cols.map((_, i) => (i === 0 ? "text" : "num"));
  const head =
    `<tr><th class="rn"><i class="cb"></i></th>` +
    s.cols
      .map(
        (c, i) =>
          `<th class="${i === s.newCol ? "is-new-col" : ""}">${ICONS[types[i]]}<span>${esc(c)}</span>${i === s.newCol ? '<em class="added">Added</em>' : ""}</th>`
      )
      .join("") +
    `<th class="plus-col"><svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg></th></tr>`;
  const body = s.rows
    .map((r, n) => {
      const flag = r[s.cols.length] || "";
      const cells = s.cols
        .map((_, i) => {
          const v = (r[i] || "").trim();
          const pad = (r[i] || "").startsWith("  ") ? ' style="padding-left:28px"' : "";
          const sign = (s.signed || []).includes(i) ? (v.startsWith("+") ? "pos" : v.startsWith("−") ? "neg" : "") : "";
          const cls = [i === s.newCol ? "is-new-col" : "", types[i] === "num" && v ? "num" : "", sign].join(" ");
          const inner = types[i] === "cat" && v ? `<span class="tag tag--${TAGS[v] || "blue"}">${esc(v)}</span>` : esc(v);
          return `<td class="${cls}"${pad}>${inner}</td>`;
        })
        .join("");
      return `<tr class="${flag}"><td class="rn"><b>${n + 1}</b><i class="cb"></i></td>${cells}<td class="plus-col"></td></tr>`;
    })
    .join("");
  const grid = $("#grid");
  grid.innerHTML = head + body;
  grid.classList.remove("is-adding");
  void grid.offsetWidth;
  if (s.newCol != null) grid.classList.add("is-adding");
  $("#sheet-title").textContent = s.title;
  $("#attach").hidden = !s.attach;
  $("#view-home").hidden = true;
  $("#view-sheet").hidden = false;
  document.title = s.title;
  document.querySelectorAll(".sheet-link").forEach((a) => a.classList.toggle("is-active", a.dataset.sheet === key));
  document.querySelector(".nav__item.is-active[href]")?.classList.remove("is-active");
  current = key;
}

function openHome() {
  $("#view-home").hidden = false;
  $("#view-sheet").hidden = true;
  document.title = "Home";
  document.querySelectorAll(".sheet-link").forEach((a) => a.classList.remove("is-active"));
  document.querySelector('.nav__item[href="#home"]')?.classList.add("is-active");
  current = null;
}

let current = null;

function route() {
  const landing = !location.hash || location.hash === "#";
  document.body.classList.toggle("is-landing", landing);
  if (landing) {
    document.title = "Bean — Books, kept for you";
    return;
  }
  const m = location.hash.match(/^#sheet=(\w+)/);
  if (m && SHEETS[m[1]]) openSheet(m[1]);
  else openHome();
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

function download(keys, name) {
  const lines = [];
  keys.forEach((k) => {
    const s = SHEETS[k];
    lines.push(csvCell(s.title));
    lines.push(s.cols.map(csvCell).join(","));
    s.rows.forEach((r) => lines.push(s.cols.map((_, i) => csvCell((r[i] || "").trim())).join(",")));
    lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

cards("#recent");
cards("#private");

document.addEventListener("click", (e) => {
  const card = e.target.closest(".card, .sheet-link");
  if (card) {
    location.hash = `sheet=${card.dataset.sheet}`;
  }
});

document.querySelector('.nav__item[href="#home"]')?.addEventListener("click", () => (location.hash = "home"));
$("#export-csv").addEventListener("click", () => download(ORDER, "bean-bookkeeper-package.csv"));
$("#sheet-csv").addEventListener("click", () => current && download([current], `${SHEETS[current].title}.csv`));
$("#export-pdf").addEventListener("click", () => window.print());
$("#sheet-pdf").addEventListener("click", () => window.print());
$("#send-bookkeeper").addEventListener("click", (e) => {
  e.target.textContent = "Sent ✓";
});

window.addEventListener("hashchange", route);
route();

document.addEventListener("pointermove", (e) => {
  const k = document.querySelector(".keys");
  if (k) k.style.setProperty("--tilt", ((e.clientX / window.innerWidth - 0.5) * 6).toFixed(2) + "deg");
});

(function intro() {
  const el = document.querySelector("#intro");
  if (!el) return;
  let seen = false;
  try { seen = sessionStorage.getItem("bean-intro") === "1"; } catch (e) {}
  if (seen || (location.hash && location.hash !== "#")) { el.remove(); return; }
  const out = () => { el.classList.add("is-out"); setTimeout(() => el.remove(), 800); };
  el.addEventListener("click", out);
  setTimeout(() => el.classList.add("is-grow"), 1500);
  setTimeout(() => el.classList.add("is-text"), 2300);
  setTimeout(out, 4300);
  try { sessionStorage.setItem("bean-intro", "1"); } catch (e) {}
})();
