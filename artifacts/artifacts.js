// All artifacts: searchable, filterable, sortable; grid or list.
const ICON = { Agent: ["#2f6f52", "◐"], Model: ["#e8622a", "↗"], Sheet: ["#3aa655", "▦"], Notebook: ["#5b8ee6", "✎"] };
const PV = {
  Agent: '<div class="pv-orb"><i></i><i></i></div>',
  Model: '<div class="pv-phone">Add money<b>$690</b><u></u></div>',
  Sheet: '<div class="pv-sheet"><b>Profit &amp; Loss</b><div><span>Revenue</span><span>$1,200</span></div><div><span>Expenses</span><span>$85</span></div><div><span>Net profit</span><span>$1,115</span></div></div>',
  Notebook: '<div class="pv-note"><i></i><i></i><i></i><i></i></div>',
};
const ITEMS = [
  { name: "Repair Request Agent", type: "Agent", meta: "Agent · V1", day: "2026-11-10", href: "../new/?open=agent" },
  { name: "Forecast Custom Model", type: "Model", meta: "Model · V3", day: "2026-11-10", href: "../forecasting.html" },
  { name: "Profit and Loss Center Street", type: "Sheet", meta: "XLSX · V2", day: "2026-11-10", href: "../bookkeeper/#sheet=pnl" },
  { name: "Cash Reconciliation", type: "Sheet", meta: "XLSX · V1", day: "2026-11-09", href: "../bookkeeper/#sheet=pnl" },
  { name: "Laundry Log", type: "Notebook", meta: "Notebook · Nov 9", day: "2026-11-09", href: "../new/" },
  { name: "PL Template", type: "Sheet", meta: "XLSX · V1", day: "2026-11-08", href: "../bookkeeper/#sheet=pnl" },
];
const $ = (s) => document.querySelector(s), root = $(".ar"), out = $("#list");
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function render() {
  const q = $("#q").value.trim().toLowerCase(), type = $("#type").value, sort = $("#sort").value;
  let rows = ITEMS.filter((i) => (!type || i.type === type) && (!q || i.name.toLowerCase().includes(q)));
  rows.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "old" ? a.day.localeCompare(b.day) : b.day.localeCompare(a.day));
  if (!rows.length) { out.innerHTML = '<p class="ar__empty">No artifacts match.</p>'; return; }
  const groups = [...new Set(rows.map((r) => r.day))];
  out.innerHTML = groups.map((d) => `<h2 class="ar__day">${fmt(d)}</h2><div class="ar__grid">${rows.filter((r) => r.day === d).map((r) => `<a class="ar__card" href="${r.href}"><div class="ar__prev">${PV[r.type]}</div><div class="ar__meta"><span class="ar__ic" style="background:${ICON[r.type][0]}">${ICON[r.type][1]}</span><div><strong>${esc(r.name)}</strong><span>${esc(r.meta)}</span></div></div></a>`).join("")}</div>`).join("");
}
["#q", "#type", "#sort"].forEach((s) => $(s).addEventListener("input", render));
const view = (list) => { root.classList.toggle("list", list); $("#vl").classList.toggle("on", list); $("#vg").classList.toggle("on", !list); };
$("#vg").addEventListener("click", () => view(false)); $("#vl").addEventListener("click", () => view(true));
render();
