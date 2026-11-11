// Today's books: a self-playing walkthrough over copies of the existing pages.
// 1 Send your page   - flow/note.html (copy of the phone note): the camera demo plays and Bean reads it
// 2 Check what Bean read - flow/check.html: each number is ticked off against the slip
// 3 Your books       - the v2 sheets, simplified, cycling page by page
// 4 Ask Bean         - the agent chat on /new/ works out a question from your own books
// 5 Text Bean        - the phone message demo: @forecasting answers this month's sales
// Click a step to jump to it; pause and replay sit beside the caption.

const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/$/, ''); // '/' locally, '/bean/' on GitHub Pages
const SHORT = /[?&]short\b/.test(location.search); // the home page's automatic play: photo, check, books
const STEPS = SHORT ? ['send', 'check', 'books'] : ['send', 'check', 'books', 'agent', 'text'];
document.querySelectorAll('.steps button').forEach(b => { if (!STEPS.includes(b.dataset.step)) b.parentElement.hidden = true; });
// The four books, as compact versions of the v2 sheets. `key: true` marks the line highlighted.
const TABLES = [
  { title: 'Profit & Loss', cols: ['Income & expenses', 'Planned', 'Actual', 'Diff.'], rows: [
    ['Washer collections', '$800', '$860', '+$60'], ['Dryer collections', '$250', '$265', '+$15'], ['Soap machine', '$20', '$15', '−$5'],
    ['Total revenue', '$1,070', '$1,140', '+$70', 'total'], ['Repairs (washer 6)', '$50', '$85', '−$35'], ['Detergent & supplies', '$50', '$45', '+$5'],
    ['Total expenses', '$100', '$130', '−$30', 'total'], ['Net profit', '$970', '$1,010', '+$40', 'total key'] ] },
  { title: 'Cash count', cols: ['Item', 'Amount'], rows: [
    ['Original collections', '$920'], ['Evening collections', '+$220'], ['Total collections', '$1,140', 'total'], ['Cash expenses', '−$130'],
    ['Bank deposit', '−$690'], ['Change reserve', '−$100'], ['Cash remaining in safe', '$220', 'total key'] ] },
  { title: 'Ledger', cols: ['Category', 'Before', 'After'], rows: [
    ['Washer collections', '$680', '$860', 'key'], ['Dryer collections', '$240', '$265'], ['Soap machine collections', '$0', '$15'],
    ['Repair expense (washer 6)', '$85', '$85'], ['Detergent purchase', '$45', '$45'] ] },
  { title: 'Package for your accountant', cols: ['Account', 'Debit', 'Credit'], more: '+3 more entries', rows: [
    ['Cash', '$1,140', ''], ['Laundry revenue: washers', '', '$860'], ['Laundry revenue: dryers', '', '$265'], ['Laundry revenue: soap', '', '$15'],
    ['Repairs & maintenance', '$85', ''], ['Supplies: detergent', '$45', ''], ['Cash', '', '$130'], ['Bank account', '$690', '', 'key'] ] },
];

const $ = selector => document.querySelector(selector);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#stage');
const frames = {};
const state = { noteDone: false, paused: false };

// ---------- a pausable clock ----------
let runId = 0;
class Stopped extends Error {}
function sleep(ms) {
  const id = runId;
  return new Promise((resolve, reject) => {
    let left = ms, last = performance.now();
    const tick = () => {
      if (id !== runId) return reject(new Stopped());
      const now = performance.now();
      if (!state.paused) left -= now - last;
      last = now;
      if (left <= 0) return resolve();
      setTimeout(tick, 60);
    };
    tick();
  });
}
async function waitFor(check, timeout) {
  for (let waited = 0; waited < timeout && !check(); waited += 200) await sleep(200);
}

// ---------- caption + step indicator ----------
let captionTimer = 0;
function caption(title, text = '') {
  const el = $('#caption');
  if (el.dataset.key === title + text) return;
  el.dataset.key = title + text;
  clearTimeout(captionTimer);
  el.classList.add('is-out');
  captionTimer = setTimeout(() => { $('#cap-title').textContent = title; $('#cap-text').textContent = text; el.classList.remove('is-out'); }, 420);
}
function progress(p) { document.querySelector('.steps .is-current')?.style.setProperty('--p', Math.min(1, p).toFixed(3)); }
function setStep(step) {
  const index = STEPS.indexOf(step);
  document.querySelectorAll('.steps button').forEach((b, i) => {
    b.classList.toggle('is-done', i < index);
    b.classList.toggle('is-current', i === index);
    b.style.setProperty('--p', '0');
    if (i === index) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  history.replaceState(null, '', '#' + step);
}

// ---------- frames: one per step, kept alive and cross-faded ----------
function frameFor(key, src, title) {
  if (!frames[key]) {
    const frame = document.createElement('iframe');
    frame.title = title;
    frame.src = src;
    frame.tabIndex = -1;
    frame.dataset.loaded = '';
    frame.addEventListener('load', () => { frame.dataset.loaded = '1'; onFrameLoad(key, frame); });
    stage.append(frame);
    frames[key] = frame;
  }
  return frames[key];
}
// Shrink the four tables just enough to fit the screen, so no rows get cut off (phones scroll instead).
function fitTables() {
  const panel = $('#tables'), grid = $('#tables-grid');
  if (panel.hidden) return;
  grid.style.zoom = '1';
  if (innerWidth <= 760) return;
  const cs = getComputedStyle(panel);
  const room = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const need = grid.offsetHeight;
  if (need > room) grid.style.zoom = String(Math.max(.55, room / need));
}
addEventListener('resize', fitTables);
function show(key) {
  Object.entries(frames).forEach(([k, f]) => f.classList.toggle('is-shown', k === key));
  const tables = $('#tables');
  if (key === 'tables') { tables.hidden = false; fitTables(); void tables.offsetWidth; tables.classList.add('is-shown'); } // flush styles so the fade-in runs
  else if (!tables.hidden) {
    tables.classList.remove('is-shown');
    setTimeout(() => { if (!tables.classList.contains('is-shown')) { tables.hidden = true; tables.classList.remove('is-in', 'is-key', 'is-out'); } }, 800);
  }
}
const loaded = key => waitFor(() => frames[key]?.dataset.loaded === '1', 8000);
const AGENT_SRC = () => `${BASE}/new/?skip#agent`; // ?skip: no /hello/ redirect inside the walkthrough
const TEXT_SRC = () => `${BASE}/messaging/?fast&hold`; // ?hold: wait until its step starts
const PAGES = {
  send: ['note', './note.html', 'Your notebook page'],
  check: ['check', './check.html', 'What Bean read'],
  agent: ['agent', AGENT_SRC(), 'Ask Bean'],
  text: ['text', TEXT_SRC(), 'Text Bean'],
};
const warm = step => { if (step && PAGES[step]) frameFor(...PAGES[step]); };
// Close pages we're done with so they stop animating in the background (keeps the playback smooth).
function retire(keep) {
  Object.keys(frames).forEach(k => { if (!keep.includes(k)) { frames[k].remove(); delete frames[k]; } });
}

function onFrameLoad(key, frame) {
  const doc = frame.contentDocument;
  if (!doc) return;
  if (key === 'note') watchNote(doc);
}
// Step 1: Bean has finished when the note shows "3 artifacts updated".
function watchNote(doc) {
  const toast = doc.getElementById('artifacts-toast');
  if (!toast) return;
  new MutationObserver(() => { if (!toast.hidden && toast.textContent.trim().length > 3) state.noteDone = true; })
    .observe(toast, { attributes: true, childList: true, subtree: true, characterData: true });
}

// ---------- the four scenes ----------
const SCENES = {
  async send() {
    await showWhenReady('note', './note.html', 'Your notebook page');
    caption('Snap a photo of today’s page', 'Keep using the notebook you already have. Bean only needs a picture of it.');
    await sleep(1600);
    state.noteDone = false;
    frames.note.contentWindow.dispatchEvent(new Event('open-camera'));
    progress(.2);
    await sleep(3800);
    caption('Bean is reading your page…', 'It finds each amount you wrote down: washers, dryers, the soap machine, repairs.');
    progress(.6);
    await waitFor(() => state.noteDone, 16000);
    progress(1);
    caption('3 of your books are updated', 'Your evening slip added $220, so Monday comes to $1,140 collected.');
    await sleep(2800);
  },
  async check() {
    const frame = await showWhenReady('check', './check.html', 'What Bean read');
    caption('Checking each number against your slip', 'Nothing goes into your books until it matches what you wrote. Tap “Fix” if one is off.');
    const win = frame.contentWindow;
    win.resetChecks?.();
    await sleep(1400);
    for (let i = 0; i < 3; i++) {
      win.confirmOne?.(i);
      progress((i + 1) / 3);
      await sleep(1000);
    }
    caption('All three match your slip', 'Washers $180, dryers $25, soap machine $15.');
    await sleep(2400);
  },
  async books() {
    const tables = $('#tables');
    tables.classList.remove('is-in', 'is-key', 'is-out');
    show('tables');
    caption('Bean filled in your four books for Monday', 'The same tables a bookkeeper would keep, ready to print or send.');
    await sleep(300);
    tables.classList.add('is-in');   // the tables rise in and their rows fill, one after another
    progress(.35);
    await sleep(2900);
    tables.classList.add('is-key');  // then the line that matters in each lights up
    caption('Each one is up to date', 'Profit $1,010 for the day, $220 left in the safe, and a package ready for your accountant.');
    progress(.75);
    await sleep(3600);
    progress(1);
    tables.classList.add('is-out');  // and they float away before the next step
    await sleep(900);
  },
  async agent() {
    let frame = frameFor(...PAGES.agent);
    if (frame.dataset.used) { retire(Object.keys(frames).filter(k => k !== 'agent')); frame = frameFor(...PAGES.agent); } // fresh chat each time
    await loaded('agent');
    const doc = frame.contentDocument;
    doc.querySelector('#bean-entry button')?.click(); // skip its opening animation
    await waitFor(() => !doc.getElementById('agent')?.hidden, 3000);
    show('agent');
    caption('Ask Bean anything', 'Use @ to point Bean at your notebook or any of your books.');
    await sleep(1000);
    frame.dataset.used = '1';
    doc.querySelector('#agent [data-demo="forecast"]')?.click();
    progress(.2);
    await sleep(3400);
    caption('Can you afford a new washer?', 'Bean checks your Laundry Log and Profit & Loss to find out.');
    progress(.6);
    await sleep(7400);
    caption('Bean works it out from your own books', 'The answer comes with the numbers behind it, so you can check them.');
    progress(1);
    await sleep(5600);
  },
  async text() {
    const frame = frameFor(...PAGES.text);
    await loaded('text');
    const doc = frame.contentDocument;
    doc.getElementById('replay')?.click(); // play the message demo from the start
    show('text');
    caption('Or just text Bean', 'Ask from your phone, the way you’d text a friend.');
    await sleep(3400);
    caption('Bean looks it up in your forecast', 'It reads the same numbers you’d see on the forecast page.');
    progress(.4);
    await waitFor(() => /Heads up/.test(doc.getElementById('thread')?.textContent || ''), 40000);
    caption('Bean answers in plain words', 'About ¥468,900 this month, and Park may need a visit.');
    progress(.8);
    await sleep(4600);
    progress(1);
    caption('That’s Monday, done', 'Tomorrow, just send another photo of your page.');
  },
};

async function showWhenReady(key, src, title) {
  const frame = frameFor(key, src, title);
  await loaded(key);
  show(key);
  return frame;
}

// ---------- play / pause / jump ----------
async function play(from = 'send') {
  const id = ++runId;
  document.body.classList.remove('is-finished', 'is-leaving');
  try {
    retire([PAGES[from]?.[0]]);
    for (const step of STEPS.slice(STEPS.indexOf(from))) {
      setStep(step);
      warm(step);
      const next = STEPS[STEPS.indexOf(step) + 1];
      // once this step is showing, drop the old page and start loading the next one
      setTimeout(() => { if (id === runId) { retire([PAGES[step]?.[0], PAGES[next]?.[0]]); warm(next); } }, 1600);
      await SCENES[step]();
    }
    if (id === runId) {
      document.querySelectorAll('.steps button').forEach(b => b.classList.add('is-done'));
      document.body.classList.add('is-finished');
      if (SHORT) caption('That’s Monday, done', 'Tomorrow, just send another photo of your page.');
      // when shown as a card on the home page, let it know we're finished
      // Close into the home page: in its card, the home page shrinks it back down; opened on its own, we go home.
      await sleep(2400);                                 // let the last line be read
      if (id !== runId) return;
      document.body.classList.add('is-leaving');         // fade to a calm, empty page…
      await sleep(700);
      if (id !== runId) return;
      if (window.parent !== window) window.parent.postMessage({ bean: 'flow-done' }, location.origin);
      else location.href = `${BASE}/new/?skip`;          // ?skip: straight to the home page, no intro
    }
  } catch (error) {
    if (!(error instanceof Stopped)) throw error;
  }
}
function setPaused(paused) {
  state.paused = paused;
  document.body.classList.toggle('is-paused', paused);
  $('#pause').setAttribute('aria-label', paused ? 'Play' : 'Pause');
  const note = frames.note?.contentDocument?.getElementById('camera-video');
  if (note) paused ? note.pause() : note.play?.().catch(() => {});
}

$('#pause').addEventListener('click', () => {
  if (document.body.classList.contains('is-finished')) { setPaused(false); play('send'); return; }
  setPaused(!state.paused);
});
$('#replay').addEventListener('click', () => { setPaused(false); play('send'); });
document.querySelectorAll('.steps button').forEach(b => b.addEventListener('click', () => { setPaused(false); play(b.dataset.step); }));


// typing or following a link like /flow/#books jumps there (our own replaceState doesn't fire this)
addEventListener('hashchange', () => { const step = location.hash.slice(1); if (STEPS.includes(step)) { setPaused(false); play(step); } });

// the four tables
const cell = v => /^\+\$/.test(v) ? `<td class="pos">${v}</td>` : /^−\$/.test(v) ? `<td class="neg">${v}</td>` : `<td>${v}</td>`;
$('#tables-grid').innerHTML = TABLES.map((t, i) => `
  <section class="tbl" style="--i:${i}">
    <header><b>${t.title}</b><span>Monday, Nov 9</span></header>
    <table>
      <thead><tr>${t.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map((r, j) => {
        const cls = r.length > t.cols.length ? r[t.cols.length] : '';
        return `<tr class="${cls}" style="--r:${j}">${r.slice(0, t.cols.length).map((v, k) => k ? cell(v) : `<td>${v}</td>`).join('')}</tr>`;
      }).join('')}</tbody>
    </table>
    ${t.more ? `<p class="more">${t.more}</p>` : ''}
  </section>`).join('');


const start = STEPS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'send';
if (reduceMotion) setPaused(true);
play(start);
