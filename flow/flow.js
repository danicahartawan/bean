// Today's books: a self-playing walkthrough over copies of the existing pages.
// 1 Send your page   - flow/note.html (copy of the phone note): the camera demo plays and Bean reads it
// 2 Check what Bean read - flow/check.html: each number is ticked off against the slip
// 3 Your books       - the v2 sheets, simplified, cycling page by page
// 4 Ask Bean         - the agent chat on /new/ works out a question from your own books
// 5 Text Bean        - the phone message demo: @forecasting answers this month's sales
// Click a step to jump to it; pause and replay sit beside the caption.

const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/$/, ''); // '/' locally, '/bean/' on GitHub Pages
const STEPS = ['send', 'check', 'books', 'agent', 'text'];
const SHEETS = [
  { key: 'pnl', label: 'Profit & Loss', about: 'What came in, what went out, and what you kept: $1,010 profit for the day.' },
  { key: 'recon', label: 'Cash count', about: 'What you collected, spent and deposited, so the safe should hold $220.' },
  { key: 'ledger', label: 'Ledger', about: 'Every amount, line by line, the way your paper ledger has it.' },
  { key: 'journal', label: 'Package for your accountant', about: 'Each entry with where its number came from, ready to hand over.' },
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
  captionTimer = setTimeout(() => { $('#cap-title').textContent = title; $('#cap-text').textContent = text; el.classList.remove('is-out'); }, 260);
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
function show(key) {
  Object.entries(frames).forEach(([k, f]) => f.classList.toggle('is-shown', k === key));
}
const loaded = key => waitFor(() => frames[key]?.dataset.loaded === '1', 8000);
const reloadFrame = async key => { frames[key].dataset.loaded = ''; frames[key].contentWindow.location.reload(); await loaded(key); };
const AGENT_SRC = () => `${BASE}/new/#agent`;
const TEXT_SRC = () => `${BASE}/messaging/`;

function onFrameLoad(key, frame) {
  const doc = frame.contentDocument;
  if (!doc) return;
  if (key === 'note') watchNote(doc);
  if (key === 'books') simplifyBooks(doc);
}
// Step 1: Bean has finished when the note shows "3 artifacts updated".
function watchNote(doc) {
  const toast = doc.getElementById('artifacts-toast');
  if (!toast) return;
  new MutationObserver(() => { if (!toast.hidden && toast.textContent.trim().length > 3) state.noteDone = true; })
    .observe(toast, { attributes: true, childList: true, subtree: true, characterData: true });
}
// Step 3: the v2 sheets without spreadsheet controls, in larger type.
function simplifyBooks(doc) {
  if (doc.getElementById('flow-simplify')) return;
  const style = doc.createElement('style');
  style.id = 'flow-simplify';
  style.textContent = `
    .sbar, .fbar, .tbar, .addrow, .plus-col, .grid .rn, .pnl-summary > h2 { display: none !important; }
    .sheetview { padding-top: 22px !important; }
    .sheetview .grid { font-size: 17px !important; }
    .sheetview .grid th, .sheetview .grid td { height: 48px !important; }
  `;
  doc.head.append(style);
}

// ---------- the four scenes ----------
const SCENES = {
  async send() {
    frameFor('note', './note.html', 'Your notebook page');
    show('note');
    caption('Snap a photo of today’s page', 'Keep using the notebook you already have. Bean only needs a picture of it.');
    await loaded('note');
    await sleep(1600);
    state.noteDone = false;
    frames.note.contentWindow.dispatchEvent(new Event('open-camera'));
    progress(.15);
    await sleep(4600);
    caption('Bean is reading your page…', 'It finds each amount you wrote down: washers, dryers, the soap machine, repairs.');
    progress(.5);
    await waitFor(() => state.noteDone, 16000);
    progress(1);
    caption('3 of your books are updated', 'Your evening slip added $220, so Monday comes to $1,140 collected.');
    await sleep(2400);
  },
  async check() {
    frameFor('check', './check.html', 'What Bean read');
    show('check');
    caption('Checking each number against your slip', 'Nothing goes into your books until it matches what you wrote. Tap “Fix” if one is off.');
    await loaded('check');
    const win = frames.check.contentWindow;
    win.resetChecks?.();
    await sleep(1400);
    for (let i = 0; i < 3; i++) {
      win.confirmOne?.(i);
      progress((i + 1) / 3);
      await sleep(1000);
    }
    caption('All three match your slip', 'Washers $180, dryers $25, soap machine $15.');
    await sleep(2000);
  },
  async books() {
    frameFor('books', `${BASE}/bookkeeper-v2/?embed#sheet=pnl`, 'Your books');
    show('books');
    frameFor('agent', AGENT_SRC(), 'Ask Bean');   // load ahead of time so they're ready
    frameFor('text', TEXT_SRC(), 'Text Bean');
    caption('Bean filled in four pages for Monday', 'The same pages a bookkeeper would keep, ready to print or send.');
    await loaded('books');
    await sleep(1800);
    for (const [i, sheet] of SHEETS.entries()) {
      const frame = frames.books;
      if (frame.contentWindow.location.hash !== '#sheet=' + sheet.key) {
        frame.classList.add('is-swapping');
        await sleep(260);
        frame.contentWindow.location.hash = 'sheet=' + sheet.key;
        await sleep(120);
        frame.classList.remove('is-swapping');
      }
      caption(sheet.label, sheet.about);
      progress((i + 1) / SHEETS.length);
      await sleep(2800);
    }
  },
  async agent() {
    const frame = frameFor('agent', AGENT_SRC(), 'Ask Bean');
    if (frame.dataset.used) await reloadFrame('agent'); // start each time with a fresh chat
    await loaded('agent');
    show('agent');
    caption('Ask Bean anything', 'Use @ to point Bean at your notebook or any of your books.');
    const doc = frame.contentDocument;
    await waitFor(() => !doc.getElementById('bean-entry') && !doc.getElementById('agent')?.hidden, 6000); // let its intro finish
    await sleep(900);
    frame.dataset.used = '1';
    doc.querySelector('#agent [data-demo="forecast"]')?.click();
    progress(.2);
    await sleep(3200);
    caption('Can you afford a new washer?', 'Bean checks your Laundry Log and Profit & Loss to find out.');
    progress(.6);
    await sleep(8000);
    caption('Bean works it out from your own books', 'The answer comes with the numbers behind it, so you can check them.');
    progress(1);
    await sleep(6500);
  },
  async text() {
    const frame = frameFor('text', TEXT_SRC(), 'Text Bean');
    await loaded('text');
    const doc = frame.contentDocument;
    doc.getElementById('replay')?.click(); // play the message demo from the start
    show('text');
    caption('Or just text Bean', 'Ask from your phone, the way you’d text a friend.');
    await sleep(4500);
    caption('Bean looks it up in your forecast', 'It reads the same numbers you’d see on the forecast page.');
    progress(.4);
    await waitFor(() => /Heads up/.test(doc.getElementById('thread')?.textContent || ''), 40000);
    caption('Bean answers in plain words', 'About $468,900 this month, and Park may need a visit.');
    progress(.8);
    await sleep(5500);
    progress(1);
    caption('That’s Monday, done', 'Tomorrow, just send another photo of your page.');
  },
};

// ---------- play / pause / jump ----------
async function play(from = 'send') {
  const id = ++runId;
  document.body.classList.remove('is-finished');
  try {
    for (const step of STEPS.slice(STEPS.indexOf(from))) {
      setStep(step);
      await SCENES[step]();
    }
    if (id === runId) {
      document.querySelectorAll('.steps button').forEach(b => b.classList.add('is-done'));
      document.body.classList.add('is-finished');
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

const start = STEPS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'send';
if (reduceMotion) setPaused(true);
play(start);
