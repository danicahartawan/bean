// Today's books: one guided flow over copies of the existing pages.
// 1 Send your page (flow/note.html, a copy of the phone note)
// 2 Check what Bean read (flow/check.html)
// 3 Your books (the v2 sheets, simplified while shown here)
// 4 Look ahead (a short forecast summary; the full page is one tap away)

const STEPS = ['send', 'check', 'books', 'ahead'];
const COPY = {
  send: {
    title: "Send today's page",
    text: 'Take a photo of your notebook page. Bean reads it and fills in your books for you.',
    next: 'Next: check what Bean read',
  },
  check: {
    title: 'Check what Bean read',
    text: 'These are the numbers Bean read from your evening slip. Tap “Looks right” for each one, or “Fix” to change it.',
    next: 'Next: see your books',
  },
  books: {
    title: 'Your books are ready',
    text: 'Bean filled in four pages for Monday. Pick one to look at, then print it or send it to your bookkeeper.',
    next: 'Next: look ahead',
  },
  ahead: {
    title: 'Look ahead',
    text: 'What to expect from your machines for the rest of the month.',
    next: 'Finish',
  },
};
const SHEETS = [
  { key: 'pnl', label: 'Profit & Loss' },
  { key: 'recon', label: 'Cash count' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'journal', label: 'Package for your accountant' },
];
// Month view of the sales forecast (forecasting.html#sales), sample data.
const FORECAST = {
  machines: [
    { name: 'Station', value: 313400, note: 'up to ¥391,800 if it’s busy' },
    { name: 'Office', value: 94900 },
    { name: 'Park', value: 60600 },
  ],
  check: 'Park came in 35% under last week (¥12,900 vs ¥19,800 expected). It may be jammed.',
};

const ICON = {
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 14h10v6H7Z"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7Z"/><path d="m11 13 9-9"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M5 15l4-4 3 3 6-7"/></svg>',
};

const $ = selector => document.querySelector(selector);
const yen = value => '¥' + value.toLocaleString('en-US');
const state = { sent: false, reading: false, checked: false, sawBooks: false, done: false, sheet: 'pnl', sentTo: false, detail: false };
const stage = $('#stage');
const frames = {};

const stepNow = () => (STEPS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'send');
const go = step => { if (location.hash.slice(1) === step) render(); else location.hash = step; };

// ---------- frames: one per step, kept alive so nothing resets when you go back ----------
function frameFor(key, src, title) {
  if (!frames[key]) {
    const frame = document.createElement('iframe');
    frame.title = title;
    frame.hidden = true;
    frame.src = src;
    frame.addEventListener('load', () => onFrameLoad(key, frame));
    stage.append(frame);
    frames[key] = frame;
  }
  return frames[key];
}
function showOnly(key) {
  Object.entries(frames).forEach(([k, f]) => { f.hidden = k !== key; });
  $('#ahead').hidden = key !== 'ahead-summary';
}

function onFrameLoad(key, frame) {
  const doc = frame.contentDocument;
  if (!doc) return;
  if (key === 'note') watchNote(doc);
  if (key === 'books') simplifyBooks(doc);
}

// Step 1: notice when Bean has finished reading the photo ("3 artifacts updated").
function watchNote(doc) {
  const toast = doc.getElementById('artifacts-toast');
  if (!toast) return;
  const seen = () => {
    if (!toast.hidden && toast.textContent.trim().length > 3) {
      state.sent = true; state.reading = false; observer.disconnect(); render();
    }
  };
  const observer = new MutationObserver(seen);
  observer.observe(toast, { attributes: true, childList: true, subtree: true, characterData: true });
}
function takePhoto() {
  const frame = frames.note;
  if (!frame?.contentWindow || state.reading) return;
  state.reading = true; state.sent = false; render();
  frame.contentWindow.dispatchEvent(new Event('open-camera'));
}

// Step 3: show the v2 sheets without the spreadsheet controls, in larger type.
function simplifyBooks(doc) {
  if (doc.getElementById('flow-simplify')) return;
  const style = doc.createElement('style');
  style.id = 'flow-simplify';
  style.textContent = `
    .sbar, .fbar, .tbar, .addrow, .plus-col, .grid .rn, .pnl-summary > h2 { display: none !important; }
    .sheetview { padding-top: 22px !important; }
    .sheetview .grid { font-size: 18px !important; }
    .sheetview .grid th { font-size: 15px !important; color: #5f5e57 !important; }
    .sheetview .grid th, .sheetview .grid td { height: 52px !important; }
    .pnl-page .money-overview span { font-size: 15px !important; color: #5f5e57 !important; }
    .pnl-page .money-overview strong, .pnl-page .money-overview #coin-summary { font-size: 32px !important; }
    .tag { font-size: 14px !important; padding: 3px 9px !important; }
  `;
  doc.head.append(style);
}
function showSheet(key) {
  state.sheet = key;
  const frame = frames.books;
  if (frame?.contentWindow) frame.contentWindow.location.hash = 'sheet=' + key;
  render();
}

// Step 2 talks back when everything has been checked.
addEventListener('message', event => {
  if (event.origin !== location.origin || !event.data) return;
  if (event.data.bean === 'checked') { state.checked = true; render(); }
  if (event.data.bean === 'unchecked') { state.checked = false; render(); }
});

// ---------- the guide panel ----------
function button(html, className, onClick, extra = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + className;
  b.innerHTML = html;
  b.addEventListener('click', onClick);
  Object.assign(b, extra);
  return b;
}
function note(text, className = 'hint') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  return p;
}

function renderActions(step) {
  const box = $('#guide-actions');
  box.replaceChildren();
  if (step === 'send') {
    box.append(button(`${ICON.camera}<span>${state.reading ? 'Bean is reading your page…' : state.sent ? 'Take another photo' : 'Take a photo of today’s page'}</span>`,
      'btn--primary btn--big', takePhoto, { disabled: state.reading }));
    box.append(note('You can also type a new line straight into the note, like “tipped the repair guy 20 dollars”.'));
  }
  if (step === 'check') {
    box.append(button(`${ICON.check}<span>Everything looks right</span>`, 'btn--ok btn--big', () => frames.check?.contentWindow?.confirmAll?.()));
  }
  if (step === 'books') {
    box.append(note('Pages', 'label'));
    SHEETS.forEach(sheet => box.append(button(`<span>${sheet.label}</span>`, state.sheet === sheet.key ? 'is-picked' : '', () => showSheet(sheet.key),
      { ariaPressed: String(state.sheet === sheet.key) })));
    box.append(note('This page', 'label'));
    const row = document.createElement('div');
    row.className = 'row';
    row.append(
      button(`${ICON.print}<span>Print</span>`, '', () => frames.books?.contentWindow?.print()),
      button(`${ICON.send}<span>${state.sentTo ? 'Sent ✓' : 'Send'}</span>`, state.sentTo ? 'btn--ok' : '', () => { state.sentTo = true; render(); }),
    );
    box.append(row);
    box.append(note('“Send” shares all four pages with your bookkeeper.'));
  }
  if (step === 'ahead') {
    box.append(button(`${ICON.chart}<span>${state.detail ? 'Back to the summary' : 'See the full forecast'}</span>`, '', () => { state.detail = !state.detail; render(); }));
  }
}

function doneText(step) {
  if (step === 'send' && state.sent) return '✓ Bean read your page and updated 3 of your books.';
  if (step === 'check' && state.checked) return '✓ All checked. Bean will use these numbers.';
  if (step === 'books' && state.sentTo) return '✓ Sent to your bookkeeper.';
  if (step === 'ahead' && state.done) return '✓ You’re all set for Monday.';
  return '';
}

function render() {
  const step = stepNow();
  const index = STEPS.indexOf(step);
  const copy = COPY[step];
  if (step === 'books') state.sawBooks = true;
  const done = { send: state.sent, check: state.checked, books: state.sawBooks && step !== 'books', ahead: state.done };

  document.querySelectorAll('.steps a').forEach((link, i) => {
    const key = link.dataset.step;
    link.classList.toggle('is-current', i === index);
    link.classList.toggle('is-done', Boolean(done[key]) && i !== index);
    if (i === index) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
  });
  $('#guide-step').textContent = `Step ${index + 1} of ${STEPS.length}`;
  $('#guide-title').textContent = copy.title;
  $('#guide-text').textContent = copy.text;
  renderActions(step);
  const message = doneText(step);
  $('#guide-done').hidden = !message;
  $('#guide-done').textContent = message;
  $('#prev').disabled = index === 0;
  $('#next').textContent = (step === 'ahead' && state.done) ? 'Start a new day' : copy.next + (step === 'ahead' ? ' ✓' : ' →');

  // stage
  if (step === 'send') { frameFor('note', './note.html', 'Your notebook page'); showOnly('note'); }
  if (step === 'check') { frameFor('check', './check.html', 'What Bean read'); showOnly('check'); }
  if (step === 'books') { frameFor('books', `/bookkeeper-v2/?embed#sheet=${state.sheet}`, 'Your books'); showOnly('books'); }
  if (step === 'ahead') {
    if (state.detail) { frameFor('forecast', '/forecasting.html', 'Full forecast'); showOnly('forecast'); }
    else showOnly('ahead-summary');
  }
}

$('#prev').addEventListener('click', () => { const i = STEPS.indexOf(stepNow()); if (i > 0) go(STEPS[i - 1]); });
$('#next').addEventListener('click', () => {
  const i = STEPS.indexOf(stepNow());
  if (i < STEPS.length - 1) { go(STEPS[i + 1]); return; }
  if (!state.done) { state.done = true; render(); return; }
  location.hash = 'send'; location.reload(); // start a new day
});
addEventListener('hashchange', render);

// look-ahead summary content
(() => {
  const total = FORECAST.machines.reduce((sum, m) => sum + m.value, 0);
  const max = Math.max(...FORECAST.machines.map(m => m.value));
  $('#ahead-total').textContent = yen(total);
  $('#ahead-bars').innerHTML = FORECAST.machines.map(m => `
    <li><span>${m.name}</span><i style="width:${Math.round((m.value / max) * 100)}%"></i><b>${yen(m.value)}</b>${m.note ? `<small>${m.note}</small>` : ''}</li>`).join('');
  $('#ahead-check').textContent = FORECAST.check;
})();

render();
