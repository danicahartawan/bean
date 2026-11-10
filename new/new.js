(() => {
  const entry = document.querySelector("#bean-entry");
  if (!entry) return;
  const content = document.querySelector(".wrap");
  const dock = document.querySelector(".dock");
  const finish = () => {
    content?.removeAttribute("inert");
    dock?.removeAttribute("inert");
    document.querySelector("#bean-brand")?.classList.add("is-visible");
    entry.remove();
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finish();
    return;
  }
  content?.setAttribute("inert", "");
  dock?.setAttribute("inert", "");
  entry.querySelector("button").addEventListener("click", finish);
  entry.addEventListener("animationend", event => {
    if (event.target === entry) finish();
  });
  window.setTimeout(finish, 3800);
})();
document.querySelectorAll("[data-row]").forEach((row) => {
  const bars = row.parentElement.querySelectorAll("[data-bars] i");
  const cards = [...row.children];
  const GAP = 30;
  const base = () => cards[0].offsetLeft;
  const layout = () => {
    const sl = row.scrollLeft;
    let active = 0, best = 1e9;
    cards.forEach((c, i) => {
      const pos = c.offsetLeft - base() - sl; // 0 = aligned with content left
      const w = c.offsetWidth + GAP;
      const d = pos / w;
      if (Math.abs(pos) < best) { best = Math.abs(pos); active = i; }
      let t;
      if (d >= 0) {
        const k = Math.min(1, d);
        t = `scale(${1 - 0.14 * k})`;
        c.style.opacity = 1;
      } else {
        const p = Math.min(1, -d);
        const e = p * p * (3 - 2 * p);
        t = `rotateY(${(-26 * e).toFixed(1)}deg) scale(${(1 - 0.72 * e).toFixed(3)}, ${(1 - 0.12 * e).toFixed(3)})`;
        c.style.transformOrigin = "right center";
        c.style.opacity = 1 - 0.15 * e;
        c.style.zIndex = 0;
        c.style.transform = t;
        return;
      }
      c.style.transformOrigin = "left center";
      c.style.transform = t;
    });
    if (sl >= row.scrollWidth - row.clientWidth - 2) active = cards.length - 1;
    bars.forEach((b, n) => b.classList.toggle("on", n === active));
    const lb = row.parentElement.querySelector(".agent"); const t = cards[active] && cards[active].dataset.label; if (lb && t && lb.textContent !== t) lb.textContent = t;
  };
  row.addEventListener("scroll", layout, { passive: true });
  window.addEventListener("resize", layout);
  layout();
  bars.forEach((b, n) => b.addEventListener("click", () => cards[n] && row.scrollTo({ left: cards[n].offsetLeft - base(), behavior: "smooth" })));
});

(() => {
  const ag = document.getElementById("agent");
  if (!ag) return;
  let srcCard = null, anim = null;
  const clipFor = (c) => { const r = c.getBoundingClientRect(), W = innerWidth, H = innerHeight; return `inset(${Math.max(0, r.top)}px ${Math.max(0, W - r.right)}px ${Math.max(0, H - r.bottom)}px ${Math.max(0, r.left)}px round 28px)`; };
  const FULL = "inset(0px 0px 0px 0px round 0px)";
  const frame = ag.querySelector(".ag__frame");
  const open = (card) => {
    srcCard = card || srcCard;
    if (anim) anim.cancel();
    ag.hidden = false;
    const sg = document.getElementById("ag-sug");
    if (sg) sg.scrollLeft = 0; main.classList.remove("sugon");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (srcCard && !reduce) {
      const t = { duration: 680, easing: "cubic-bezier(.32,.72,0,1)", fill: "both" };
      anim = ag.animate([{ clipPath: clipFor(srcCard), backgroundColor: "#ffffff" }, { clipPath: FULL, backgroundColor: "#f7f7f4" }], t);
      frame.animate([{ opacity: 0, transform: "scale(.94)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { ...t, duration: 520, delay: 240 });
      srcCard.style.visibility = "hidden";
      anim.onfinish = () => { anim.cancel(); anim = null; };
    }
  };
  const close = () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => { ag.hidden = true; if (srcCard) srcCard.style.visibility = ""; anim = null; };
    if (!srcCard || reduce) return done();
    if (anim) anim.cancel();
    const t = { duration: 560, easing: "cubic-bezier(.32,.72,0,1)", fill: "both" };
    frame.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "scale(.94)", filter: "blur(6px)" }], { duration: 260, easing: "ease-in", fill: "both" });
    anim = ag.animate([{ clipPath: FULL, backgroundColor: "#f7f7f4" }, { clipPath: clipFor(srcCard), backgroundColor: "#ffffff" }], { ...t, delay: 120 });
    anim.onfinish = () => { done(); frame.getAnimations().forEach((a) => a.cancel()); };
  };
  document.querySelectorAll("[data-agent]").forEach((c) => {
    c.addEventListener("click", () => open(c));
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(c); } });
  });
  ag.querySelector("[data-close]").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  const input = document.getElementById("ag-input"), log = document.getElementById("ag-log"), main = document.getElementById("ag-main"), form = document.getElementById("ag-form");
  const MEN = [{ n: "Laundry Log", s: "Notebook \u00b7 Nov 9", i: "\u270e" }, { n: "Profit & Loss", s: "Sheet \u00b7 Mon 9/11", i: "$" }, { n: "Cash Reconciliation", s: "Sheet \u00b7 Mon 9/11", i: "\u2713" }, { n: "Revenue Analysis", s: "bean model", i: "\u25d4" }];
  const men = document.getElementById("ag-men"), mir = document.getElementById("ag-mir");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const withMentions = (s) => esc(s).replace(/@(Laundry Log|Profit &amp; Loss|Cash Reconciliation|Revenue Analysis)/g, '<span class="mir-m">@$1</span>');
  let msel = 0, mlist = [];
  function fragAt() { const m = /@([^@\n]{0,24})$/.exec(input.value.slice(0, input.selectionStart)); return m; }
  function renderMen() {
    const m = fragAt();
    mlist = m ? MEN.filter((x) => x.n.toLowerCase().includes(m[1].trim().toLowerCase()) && !(m[1].endsWith(" ") && x.n.toLowerCase() === m[1].trim().toLowerCase())) : [];
    if (!mlist.length) { men.hidden = true; return; }
    msel = Math.min(msel, mlist.length - 1);
    men.innerHTML = mlist.map((x, i) => `<li data-i="${i}" class="${i === msel ? "sel" : ""}"><i>${x.i}</i><div>${esc(x.n)}<small>${x.s}</small></div></li>`).join("");
    men.hidden = false;
  }
  function pickMen(i) {
    const m = fragAt(); const x = mlist[i]; if (!m || !x) return;
    const pos = input.selectionStart, start = pos - m[0].length;
    input.value = input.value.slice(0, start) + "@" + x.n + " " + input.value.slice(pos);
    const np = start + x.n.length + 2; input.setSelectionRange(np, np);
    msel = 0; grow();
  }
  function grow() {
    input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px";
    form.classList.toggle("has", !!input.value.trim());
    mir.innerHTML = withMentions(input.value) + "&#8203;";
    renderMen();
  }
  input.addEventListener("input", () => { msel = 0; grow(); });
  input.addEventListener("click", renderMen); input.addEventListener("keyup", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") renderMen(); });
  men.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); pickMen(+li.dataset.i); } });
  input.addEventListener("keydown", (e) => {
    if (men.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); msel = (msel + (e.key === "ArrowDown" ? 1 : mlist.length - 1)) % mlist.length; renderMen(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopImmediatePropagation(); pickMen(msel); }
    else if (e.key === "Escape") { e.stopPropagation(); men.hidden = true; }
  }, true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let demoBusy = false;
  const typeStr = async (s, ms) => { for (const ch of s) { input.value += ch; input.setSelectionRange(input.value.length, input.value.length); grow(); await sleep(ms); } };
  const demoPick = async (name) => { const i = mlist.findIndex((x) => x.n === name); if (i < 0) return; msel = i; renderMen(); await sleep(450); pickMen(i); await sleep(200); };
  async function demoForecast() {
    if (demoBusy) return; demoBusy = true; input.value = ""; grow(); input.focus({ preventScroll: true });
    await sleep(500);
    await typeStr("hey bean, use ", 42); await typeStr("@", 0); await sleep(850);
    await typeStr("Laun", 130); await sleep(500); await demoPick("Laundry Log");
    await typeStr("and ", 55); await typeStr("@", 0); await sleep(700);
    await typeStr("Prof", 130); await sleep(500); await demoPick("Profit & Loss");
    await typeStr("to forecast whether I can afford to replace Washer #6 next month.", 24);
    await sleep(700); send(input.value); demoBusy = false;
  }
  // ===== notebook-to-model interaction =====
  const nb = document.getElementById("nb"), L = (id) => document.getElementById(id);
  const leaf = [L("leaf1"), L("leaf2")];
  const procs = [...document.querySelectorAll("#nb-proc li")];
  const entries = [...document.querySelectorAll("#nb-log li")];
  entries.forEach((li) => { li.innerHTML = '<span class="tx"></span>' + (li.dataset.v ? `<b class="hl hl--${li.dataset.c}"></b>` : ""); });
  const fillEntries = () => entries.forEach((li) => { li.querySelector(".tx").textContent = li.dataset.l; const b = li.querySelector("b"); if (b) b.textContent = li.dataset.v; });
  const clearEntries = () => entries.forEach((li) => { li.querySelector(".tx").textContent = ""; const b = li.querySelector("b"); if (b) b.textContent = ""; li.querySelectorAll(".caret").forEach((c) => c.classList.remove("caret")); });
  const pLabel = (p) => p.querySelector("span").textContent;
  const fmt = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
  let nbTimers = [], nbDone = false, nbRes = null;
  const later = (fn, ms) => nbTimers.push(setTimeout(fn, ms));
  const calc = () => {
    const cost = Math.max(0, +L("nb-cost").value || 0), res = +L("nb-res").value;
    const a = [4000, 4700, 5400, 6100, 6800], b = a.map((v, i) => (i ? v - cost : v));
    L("nb-res-v").textContent = fmt(res);
    L("fx-a").textContent = fmt(a[4]); L("fx-b").textContent = fmt(b[4]);
    const lo = Math.min(...b), lw = b.indexOf(lo);
    const ymin = Math.min(0, lo), ymax = Math.max(7000, res + 500), X = (i) => 34 + i * 80, Y = (v) => 124 - ((v - ymin) / (ymax - ymin)) * 108;
    const pts = (arr) => arr.map((v, i) => (i ? "L" : "M") + X(i) + " " + Y(v).toFixed(1)).join(" ");
    let g = "";
    for (let k = 0; k <= 3; k++) { const v = ymin + ((ymax - ymin) * k) / 3; g += `<line class="gl" x1="34" x2="354" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="30" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${fmt(Math.round(v / 100) * 100).replace(/,000$/, "K")}</text>`; }
    ["Now", "Week 1", "Week 2", "Week 3", "Week 4"].forEach((w, i) => (g += `<text x="${X(i)}" y="142" text-anchor="middle">${w}</text>`));
    L("fx-chart").innerHTML = g + `<line class="lr" x1="34" x2="354" y1="${Y(res).toFixed(1)}" y2="${Y(res).toFixed(1)}"/><path class="la" d="${pts(a)}"/><path class="lb" d="${pts(b)}"/>`;
    const gap = b[4] - res; nbRes = { cost, res, end: b[4], lo, lw, gap };
    L("fx-t").textContent = gap >= 0 ? `Yes. You\u2019d still have ${fmt(b[4])} at month end, ${fmt(gap)} above your reserve.` : `Not yet. You\u2019d end the month ${fmt(-gap)} below your reserve.`;
  };
  L("nb-cost").addEventListener("input", calc); L("nb-res").addEventListener("input", calc);
  const swapThink = (box, label, done) => {
    box.classList.toggle("done", !!done);
    const live = box.querySelector(".t-think-text:not(.is-exit)");
    if (live && live.textContent === label) return;
    const leaving = live, next = document.createElement("span");
    next.className = "t-think-text is-enter-start"; next.textContent = label; next.setAttribute("data-text", label); box.appendChild(next);
    leaving && leaving.classList.add("is-exit");
    setTimeout(() => { void next.offsetWidth; next.classList.remove("is-enter-start"); }, 50);
    if (leaving) setTimeout(() => leaving.remove(), 200);
  };
  const setState = (t) => swapThink(L("nb-chip-s"), t, /^(idle|done)$/.test(t));
  const flip = (el, on, inst) => { el.classList.toggle("instant", !!inst); el.classList.toggle("flip", on); if (on) el.style.zIndex = el === leaf[0] ? 10 : 20; else el.style.zIndex = ""; if (inst) void el.offsetWidth; };
  const resetNb = () => { nbTimers.forEach(clearTimeout); nbTimers = []; nb.classList.remove("linked"); leaf.forEach((l) => flip(l, false, true)); procs.forEach((p) => (p.className = "")); clearEntries(); document.querySelectorAll(".nb .hl").forEach((h) => h.classList.remove("on")); setState("idle"); };
  const showFinal = () => { nbDone = true; fillEntries(); document.querySelectorAll(".nb .hl").forEach((h) => h.classList.add("on")); nb.classList.add("linked"); procs.forEach((p) => (p.className = "done")); leaf.forEach((l) => flip(l, true, true)); setState("done"); };
  const addArtifact = () => {
    const c = document.querySelector("[data-nb-art]"); if (!c || !c.hidden) return;
    const grid = c.parentElement, last = [...grid.querySelectorAll(".art:not([data-nb-art])")].filter((x) => !x.hidden).pop();
    if (last) last.hidden = true; c.hidden = false;
  };
  const finalText = () => { const r = nbRes; return `${r.gap >= 0 ? "Yes, you can afford it." : "Not yet."} Replacing Washer #6 for ${fmt(r.cost)} leaves about ${fmt(r.end)} at month end, ${r.gap >= 0 ? fmt(r.gap) + " above" : fmt(-r.gap) + " below"} your ${fmt(r.res)} reserve. The lowest point is ${fmt(r.lo)} ${r.lw ? "in week " + r.lw : "right now"}. I saved the forecast to Citing your books.`; };
  const typeReply = (text) => { const b = document.createElement("div"); b.className = "ag__bean"; b.innerHTML = '<i class="ag__mark"></i><div></div>'; log.append(b); const out = b.lastElementChild, words = text.split(" "); let n = 0; const tick = () => { out.textContent += (n ? " " : "") + words[n++]; log.scrollTop = log.scrollHeight; if (n < words.length) setTimeout(tick, 40); }; tick(); };
  const I = { s: '<svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.6"/><path d="M10.5 10.5 14 14"/></svg>', g: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c2 2 2 10.4 0 12.4M8 1.8c-2 2-2 10.4 0 12.4"/></svg>', c: '<svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg>' };
  const research = (host, steps, ms) => new Promise((res) => {
    host.innerHTML = `<div class="rs"><button type="button" class="rs__h">${I.c}<span class="t-think" id="rs-think"><span class="t-think-sizer" aria-hidden="true">Estimating the next 30 days</span></span></button><div class="rs__b"></div></div>`;
    const rs = host.firstChild, body = rs.querySelector(".rs__b"), head = rs.querySelector(".rs__h");
    head.addEventListener("click", () => rs.classList.toggle("closed"));
    const scroll = () => (log.scrollTop = log.scrollHeight);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { swapThink(head.querySelector(".t-think"), "Researched", true); setTimeout(() => { rs.classList.add("closed"); res(); }, 500); return; }
      const st = steps[i++]; swapThink(head.querySelector(".t-think"), st[0]); const line = document.createElement("div"); line.className = "rs__l act"; line.innerHTML = `${I.s}<span>${st[0]}</span>`; body.append(line); scroll();
      setTimeout(() => {
        line.classList.remove("act");
        const src = st[1] || [];
        if (!src.length) return setTimeout(next, ms / 2);
        const sw = document.createElement("div"); sw.className = "rs__sw"; sw.innerHTML = `<button type="button">${I.c}<span>${src.length} sources found and more</span></button>`; body.append(sw);
        sw.firstChild.addEventListener("click", () => sw.classList.toggle("closed"));
        src.forEach((x, k) => setTimeout(() => { const r = document.createElement("div"); r.className = "rs__src" + (k === src.length - 1 && src.length > 2 ? " fade" : ""); r.innerHTML = `${I.g}<span>${x[0]}</span><em>${x[1]}</em>`; sw.append(r); scroll(); }, 220 * (k + 1)));
        setTimeout(next, 220 * src.length + 500);
      }, ms);
    };
    swapThink(head.querySelector(".t-think"), "Researching");
    setTimeout(next, 500);
  });
  const openNb = (final) => {
    calc(); resetNb(); main.classList.add("chat"); nb.classList.add("nb--inline"); log.append(nb); nb.hidden = false; setTimeout(() => nb.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
    if (final) { showFinal(); return; }
    const hl = [...document.querySelectorAll("#leaf1 .face:first-child .hl")], hl2 = [...document.querySelectorAll("#leaf2 .face:first-child .hl")];
    let t = 700;
    const typeTo = (el, text, per) => { later(() => el.classList.add("caret"), t); [...text].forEach((_, k) => later(() => (el.textContent = text.slice(0, k + 1)), t + k * per)); t += text.length * per; const at = t; later(() => el.classList.remove("caret"), at); };
    entries.forEach((li) => { typeTo(li.querySelector(".tx"), li.dataset.l, 34); const b = li.querySelector("b"); if (b) { t += 100; typeTo(b, li.dataset.v, 80); } t += 280; });
    hl.forEach((h, i) => later(() => h.classList.add("on"), t + 200 + i * 220));
    const F = t + 1500;
    later(() => flip(leaf[0], true), F);
    hl2.forEach((h, i) => later(() => h.classList.add("on"), F + 1500 + i * 300));
    const S = F + 2400;
    [0, 1, 2, 3].forEach((k) => later(() => { procs.forEach((p, n) => (p.className = n < k ? "done" : n === k ? "act" : "")); setState(pLabel(procs[k]).toLowerCase()); }, S + k * 1200));
    later(() => { procs.forEach((p) => (p.className = "done")); flip(leaf[1], true); nbDone = true; setState("done"); }, S + 4 * 1200);
    later(() => { addArtifact(); typeReply(finalText()); }, S + 4 * 1200 + 1300);
  };
  const closeNb = () => { nb.hidden = true; resetNb(); };
  nb.querySelector("[data-nb-close]").addEventListener("click", closeNb);
  document.querySelectorAll("[data-nb-art]").forEach((c) => c.addEventListener("click", () => openNb(true)));
  document.addEventListener("keydown", (e) => { if (false) { e.stopImmediatePropagation(); closeNb(); } }, true);
  const reply = (t) => /analy[sz]e/i.test(t) ? "Ran the bean model on this week\u2019s revenue. Washers drive 75% of sales and are 8% ahead of budget; dryers are 6% ahead; soap is 25% behind. Repairs ran over, which pulled net profit to $1,010." : `Got it. I logged \u201c${t.replace(/[.?!]+$/, "")}\u201d on Mon 9/11, then updated the totals and the P&L against budget.`;
  const send = (t) => {
    t = t.trim(); if (!t) return;
    main.classList.add("chat");
    const me = document.createElement("div"); me.className = "ag__me"; me.innerHTML = withMentions(t);
    const b = document.createElement("div"); b.className = "ag__bean";
    b.innerHTML = '<i class="ag__mark"></i><div></div>';
    log.append(me, b); input.value = ""; grow();
    log.scrollTop = log.scrollHeight;
    const host = b.lastElementChild;
    if (/forecast|afford|replace.*washer|@Laundry Log|@Profit &amp; Loss|@Profit & Loss/i.test(t)) { research(host, [["Reading @Laundry Log", [["Laundry Log, Mon 9/11", "notebook"], ["Washers, dryers, soap machine", "$1,200"], ["Washer 6 repair", "$85"]]], ["Reading @Profit & Loss", [["Profit & Loss, November", "books"], ["Revenue and expenses", "$1,115 net"]]], ["Estimating the next 30 days", []]], 700).then(() => openNb(false)); return; }
    const steps = /analy[sz]e/i.test(t) ? [["Running the bean model on this week", [["Profit & Loss, this week", "books"], ["Budget vs actual", "bean model"]]], ["Comparing to budget", []]] : [["Reading your notes", [["Laundry Log, Mon 9/11", "notebook"], ["Profit & Loss", "books"]]], ["Updating totals", []]];
    research(host, steps, 700).then(() => {
      const out = document.createElement("div"); out.style.marginTop = "8px"; host.append(out); const words = reply(t).split(" ");
      let n = 0;
      const tick = () => { out.textContent += (n ? " " : "") + words[n++]; log.scrollTop = log.scrollHeight; if (n < words.length) setTimeout(tick, 45); };
      tick();
    });
  };
  input.addEventListener("focus", () => main.classList.add("sugon"));
  input.addEventListener("click", () => main.classList.add("sugon"));
  input.addEventListener("blur", () => { if (!input.value.trim()) main.classList.remove("sugon"); });
  const sugBox = document.getElementById("ag-sug"); if (sugBox) sugBox.addEventListener("mousedown", (e) => e.preventDefault());
  const go = form.querySelector(".ag__go");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  const stopRec = () => { if (rec) { rec.onend = null; try { rec.stop(); } catch (_) {} rec = null; } go.classList.remove("rec"); input.placeholder = "Ask anything"; };
  const startRec = () => {
    if (!SR) { input.placeholder = "Voice isn\u2019t supported in this browser"; setTimeout(() => (input.placeholder = "Ask anything"), 2000); return; }
    rec = new SR(); rec.interimResults = true; rec.continuous = true; rec.lang = "en-US";
    rec.onresult = (e) => { input.value = [...e.results].map((r) => r[0].transcript).join(" "); grow(); };
    rec.onerror = stopRec; rec.onend = stopRec;
    go.classList.add("rec"); input.placeholder = "Listening\u2026";
    try { rec.start(); } catch (_) { stopRec(); }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (rec) { stopRec(); }
    if (!input.value.trim()) { startRec(); return; }
    send(input.value);
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  ag.querySelectorAll("[data-q]").forEach((x) => x.addEventListener("click", () => (x.dataset.demo === "forecast" ? demoForecast() : send(x.dataset.q))));
})();

// ===== Profit & Loss sheet =====
(() => {
  const pl = document.getElementById("pnl"), tb = document.getElementById("pl-rows");
  if (!pl) return;
  const M = "\u2212";
  const rows = [
    ["s", "Revenue"],
    ["r", "Washer collections", "$800", "$860", "+$60"], ["r", "Dryer collections", "$250", "$265", "+$15"], ["r", "Soap vending", "$20", "$15", M + "$5"],
    ["t", "Total recorded collections", "$1,070", "$1,140", "+$70"],
    ["s", "Cost of goods sold"],
    ["r", "Soap inventory cost", "\u2014", "Pending", "\u2014"], ["t", "Gross profit", "\u2014", "Pending", "\u2014"],
    ["s", "Operating expenses"],
    ["r", "Repairs & maintenance", "$50", "$85", M + "$35"], ["r", "Detergent & supplies", "$50", "$45", "+$5"],
    ["r", "Rent", "\u2014", "Not recorded", "\u2014"], ["r", "Water, gas & electricity", "\u2014", "Not recorded", "\u2014"], ["r", "Payroll", "\u2014", "Not recorded", "\u2014"],
    ["r", "Insurance", "\u2014", "Not recorded", "\u2014"], ["r", "Other operating expenses", "\u2014", "Not recorded", "\u2014"],
    ["t", "Recorded operating expenses", "$100", "$130", M + "$30"],
    ["t", "Preliminary collections less recorded costs", "$970", "$1,010", "+$40"],
    ["t", "Net income", "\u2014", "Not finalized", "\u2014"],
  ];
  const esc = (x) => x.replace(/&/g, "&amp;");
  const cell = (v) => (/^[A-Z]/.test(v) ? `<span class="soft">${v}</span>` : v);
  tb.innerHTML = rows.map((r) => r[0] === "s" ? `<tr class="sec"><td colspan="4">${r[1]}</td></tr>` : `<tr class="${r[0] === "t" ? "tot" : ""}"><td>${esc(r[1])}</td><td class="r">${r[2]}</td><td class="r">${cell(r[3])}</td><td class="r d ${r[4][0] === "+" ? "up" : r[4][0] === M ? "dn" : ""}">${r[4]}</td></tr>`).join("");
  const open = () => { pl.hidden = false; pl.animate([{ opacity: 0, transform: "scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" }); };
  const close = () => { if (pl.hidden) return; const a = pl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }); a.onfinish = () => (pl.hidden = true); };
  document.querySelectorAll("[data-pnl]").forEach((c) => { c.addEventListener("click", open); c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }); });
  pl.querySelector("[data-pl-close]").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pl.hidden) { e.stopImmediatePropagation(); close(); } }, true);
})();

// ===== Framed pages (Model / Sheets) =====
(() => {
  const fr = document.getElementById("frame"); if (!fr) return;
  const f = fr.querySelector("iframe");
  const open = (u) => { f.src = u; fr.hidden = false; fr.animate([{ opacity: 0, transform: "scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" }); };
  const close = () => { if (fr.hidden) return; const a = fr.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }); a.onfinish = () => { fr.hidden = true; f.src = "about:blank"; }; };
  document.querySelectorAll("[data-frame]").forEach((c) => { c.addEventListener("click", () => open(c.dataset.frame)); c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(c.dataset.frame); } }); });
  fr.querySelector(".fr__x").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !fr.hidden) { e.stopImmediatePropagation(); close(); } }, true);
})();
