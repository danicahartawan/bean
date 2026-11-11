// Hardcoded demo: the user asks @forecasting for this month's expected sales,
// Bean opens the forecast, switches it to Month, reads each machine and replies.
// Numbers mirror forecasting.html#sales (Month view, Nov 9–30, sample data).

const FORECAST = {
  range: { day: 'Nov 9–15', month: 'Nov 9–30' },
  machines: [
    { key: 'station', name: 'Station', day: 17200, dayBusy: 21500, month: 313400, monthBusy: 391800 },
    { key: 'office', name: 'Office', day: 6100, dayBusy: 7600, month: 94900, monthBusy: 118600 },
    { key: 'park', name: 'Park', day: 3400, dayBusy: 4300, month: 60600, monthBusy: 75800 },
  ],
  check: { machine: 'Park', gap: 35, expected: 19800, actual: 12900 },
};
const MONTH_TOTAL = FORECAST.machines.reduce((sum, m) => sum + m.month, 0); // $468,900

const SPARK = {
  day: 'M0 9 C10 8 18 11 30 10 S50 7 62 9 S84 13 100 12',
  month: 'M0 8 C20 8 38 5 55 5 S80 13 100 14',
};
const MENTION = 'forecasting';
const QUESTION = 'what is the expected sales this month';
const NOW = '12:41 AM';

const $ = (selector, root = document) => root.querySelector(selector);
const yen = value => '$' + Math.round(value).toLocaleString('en-US');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const thread = $('#thread');
const field = $('#field');
const fieldText = $('#field-text');
const send = $('#send');
const kb = $('#kb');
const quicktype = $('#quicktype');
const keyPop = $('#key-pop');
const initialThread = thread.innerHTML;
const initialQuicktype = quicktype.innerHTML;

// ---------- timing / cancellation ----------
let runId = 0;
class Cancelled extends Error {}
const SPEED = /[?&]fast\b/.test(location.search) ? 0.8 : 1; // ?fast: the Today's books walkthrough plays it quicker
if (SPEED < 1) document.documentElement.classList.add('is-fast');
function sleep(ms) {
  ms *= SPEED;
  const id = runId;
  return new Promise((resolve, reject) => setTimeout(() => (id === runId ? resolve() : reject(new Cancelled())), reduceMotion ? 0 : ms));
}
const jitter = (base, spread) => base + Math.random() * spread;

// ---------- phone scaling ----------
const fit = $('#device-fit');
function scaleDevice() {
  if (innerWidth <= 500) { fit.style.removeProperty('--s'); return; }
  const s = Math.min(1, (innerHeight - 96) / 876, (innerWidth - 40) / 417);
  fit.style.setProperty('--s', Math.max(.45, s).toFixed(3));
}
addEventListener('resize', scaleDevice);
scaleDevice();

// ---------- keyboard ----------
const keys = {};
function buildKeyboard() {
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const html = [];
  html.push(`<div class="kb__row">${[...rows[0]].map(k => `<span class="key" data-k="${k}">${k}</span>`).join('')}</div>`);
  html.push(`<div class="kb__row kb__row--2">${[...rows[1]].map(k => `<span class="key" data-k="${k}">${k}</span>`).join('')}</div>`);
  html.push(`<div class="kb__row kb__row--3"><span class="key key--fn key--shift">⇧</span><span class="kb__group">${[...rows[2]].map(k => `<span class="key" data-k="${k}">${k}</span>`).join('')}</span><span class="key key--fn key--del">⌫</span></div>`);
  html.push(`<div class="kb__row"><span class="key key--fn key--123" data-k="123">123</span><span class="key key--space" data-k=" ">space</span><span class="key key--fn key--return">return</span></div>`);
  $('#keys').innerHTML = html.join('');
  document.querySelectorAll('.key[data-k]').forEach(el => { keys[el.dataset.k] = el; });
}
buildKeyboard();

function pressKey(char) {
  const key = keys[char] || keys['123'];
  key.classList.add('down');
  if (/[a-z]/.test(char)) {
    keyPop.textContent = char;
    keyPop.style.left = key.offsetLeft + key.offsetWidth / 2 - 23 + 'px';
    keyPop.style.top = key.offsetTop - 50 + 'px';
    keyPop.classList.add('show');
  }
  setTimeout(() => { key.classList.remove('down'); keyPop.classList.remove('show'); }, 70);
}

// ---------- compose field ----------
function refreshField() {
  field.classList.toggle('has-text', fieldText.textContent.length > 0);
}
function plainTail() {
  let last = fieldText.lastChild;
  if (!last || last.nodeType !== Node.TEXT_NODE) { last = document.createTextNode(''); fieldText.append(last); }
  return last;
}
async function typeText(text) {
  field.classList.add('typing');
  for (const char of text) {
    pressKey(char);
    plainTail().data += char;
    refreshField();
    if (fieldText.textContent === '@f') showMentionSuggestion();
    await sleep(char === ' ' ? jitter(42, 30) : jitter(24, 28));
  }
  field.classList.remove('typing');
}
function showMentionSuggestion() {
  quicktype.classList.add('qt--mention');
  quicktype.children[1].innerHTML = `<img src="../assets/bean-avatar.png" alt="" />${MENTION}`;
}
async function acceptMention() {
  const cell = quicktype.children[1];
  cell.classList.add('hit');
  await sleep(110);
  cell.classList.remove('hit');
  // swap the typed "@fore" for a mention token
  const tail = plainTail();
  tail.data = tail.data.replace(/@\w*$/, '');
  const mention = document.createElement('span');
  mention.className = 'mention';
  mention.textContent = '@' + MENTION;
  fieldText.append(mention, document.createTextNode(' '));
  quicktype.classList.remove('qt--mention');
  quicktype.innerHTML = '<span class="qt__cell">what</span><span class="qt__cell">when</span><span class="qt__cell">how</span>';
  refreshField();
}

// ---------- thread helpers ----------
function scrollThread() {
  thread.scrollTo({ top: thread.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
}
function lastRow() {
  const rows = thread.querySelectorAll('.msg');
  return rows[rows.length - 1];
}
function addRow(side, inner, enterClass) {
  const prev = lastRow();
  if (prev && prev.classList.contains('msg--' + side)) prev.classList.remove('tail');
  const row = document.createElement('div');
  row.className = `msg msg--${side} tail ${enterClass || (side === 'out' ? 'enter-out' : 'enter-in')}`;
  row.innerHTML = inner;
  thread.append(row);
  scrollThread();
  return row;
}
function addStamp(day, time) {
  const stamp = document.createElement('p');
  stamp.className = 'stamp fade-in';
  stamp.innerHTML = `<b>${day}</b> ${time}`;
  thread.append(stamp);
}
function showTyping() {
  const row = addRow('in', '<p class="bubble bubble--typing" aria-label="Bean is typing"><i></i><i></i><i></i></p>');
  return row;
}
// Key words in a reply light up one after another once the bubble has landed.
// `.pop--big` segments first burst out of the phone as a large phrase, hold,
// then shrink back down into their place in the text. A `data-say` attribute
// lets the callout say a fuller phrase than the word it lands on.
const screenEl = $('.screen');
const callouts = document.createElement('div');
callouts.className = 'callouts';
callouts.setAttribute('aria-hidden', 'true');
document.body.append(callouts); // outside the phone, so callouts can spill past its edges

function callout(mark) {
  const id = runId;
  const sRect = screenEl.getBoundingClientRect();
  const k = sRect.width / screenEl.offsetWidth; // the phone's preview scale
  const r = mark.getBoundingClientRect();

  // The callout is a small card: the key phrase, plus a line of context under it.
  const ghost = document.createElement('span');
  ghost.className = 'callout' + (mark.classList.contains('pop--warn') ? ' callout--warn' : '');
  const say = document.createElement('b');
  say.textContent = mark.dataset.say || mark.textContent;
  ghost.append(say);
  let note = null;
  if (mark.dataset.note) {
    note = document.createElement('span');
    note.className = 'callout__note';
    note.textContent = mark.dataset.note;
    ghost.append(note);
  }
  Object.assign(ghost.style, {
    fontSize: 17 * k + 'px', padding: `${5 * k}px ${10 * k}px ${6 * k}px`, borderRadius: 12 * k + 'px', gap: 1 * k + 'px',
  });
  callouts.append(ghost);
  const gw = ghost.offsetWidth, gh = ghost.offsetHeight;
  // start centred on the word it will land on
  ghost.style.left = r.left + r.width / 2 - gw / 2 + 'px';
  ghost.style.top = r.top + r.height / 2 - gh / 2 + 'px';

  const land = Math.min(1, r.width / say.offsetWidth, r.height / gh * 1.6);
  const dx = innerWidth / 2 - (r.left + r.width / 2);
  const dy = sRect.top + sRect.height * .4 - (r.top + r.height / 2);
  // a little bigger than the phone is wide, never more than ~2x
  const big = Math.min((sRect.width * 1.12) / gw, 2.1);
  const at = (x, y, s) => `translate(${x}px, ${y}px) scale(${s})`;
  const DURATION = 2300 * Math.max(SPEED, 0.75);

  callouts.classList.add('dim');
  setTimeout(() => callouts.classList.remove('dim'), DURATION * .7);
  note?.animate([{ opacity: 1 }, { opacity: 1, offset: .66 }, { opacity: 0, offset: .78 }, { opacity: 0 }], { duration: DURATION, fill: 'forwards' });
  const anim = ghost.animate([
    { transform: at(dx, dy + 50, big * .4), opacity: 0, easing: 'cubic-bezier(.2, .9, .3, 1.2)' },
    { transform: at(dx, dy, big * 1.05), opacity: 1, offset: .16 },
    { transform: at(dx, dy, big), opacity: 1, offset: .26 },
    { transform: at(dx, dy, big), opacity: 1, offset: .68, easing: 'cubic-bezier(.6, 0, .25, 1)' },
    { transform: at(0, 0, land), opacity: .85, offset: .95 },
    { transform: at(0, 0, land), opacity: 0 },
  ], { duration: DURATION, fill: 'forwards' });
  return anim.finished.then(() => {
    ghost.remove();
    if (id !== runId) return;
    mark.classList.remove('waiting');
    mark.classList.add('on', 'landed');
  });
}

async function popWords(row) {
  const marks = [...row.querySelectorAll('.pop')];
  if (reduceMotion) { marks.forEach(mark => mark.classList.add('on')); return row; }
  marks.filter(mark => mark.classList.contains('pop--big')).forEach(mark => mark.classList.add('waiting'));
  await sleep(450); // let the bubble land and the thread finish scrolling
  for (const mark of marks) {
    if (mark.classList.contains('pop--big')) await callout(mark);
    else { mark.classList.add('on'); await sleep(260); }
    await sleep(120);
  }
  return row;
}
function removeRow(row) {
  row.remove();
  const prev = lastRow();
  // restore tail on the previous incoming group, if the typing bubble had taken it
  if (prev) prev.classList.add('tail');
}

// ---------- forecast preview card ----------
function peekMarkup() {
  const cards = FORECAST.machines.map(m => `
    <div class="pc" data-card="${m.key}">
      <span class="pc__l"><span>${m.name}</span><em data-range>${FORECAST.range.day}</em></span>
      <b class="pc__v" data-value>${yen(m.day)}</b>
      <small>Up to <span data-busy>${yen(m.dayBusy)}</span> when busy</small>
      <svg class="pc__spark" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><path d="${SPARK.day}" /><circle cx="1" cy="9" r="1.6" /></svg>
      <i class="pc__scan"></i>
    </div>`).join('');
  const c = FORECAST.check;
  return `
    <a class="bubble bubble--card" href="../forecasting.html#sales" target="_top" aria-label="Open the sales forecast">
      <div class="peek">
        <div class="peek__top"><span class="peek__title">Sales Forecast</span><span class="peek__range" data-range>${FORECAST.range.day}</span></div>
        <div class="peek__bar">
          <div class="peek__seg"><span class="on">Sales</span><span>Hot drinks</span></div>
          <div class="peek__seg" data-modes><span class="on" data-mode="day">Day</span><span data-mode="week">Week</span><span data-mode="month">Month</span></div>
        </div>
        <div class="peek__grid">
          ${cards}
          <div class="pc pc--warn" data-card="check">
            <span class="pc__l"><span>Needs a check</span><em>${c.machine}</em></span>
            <b class="pc__v">−${c.gap}%</b>
            <small>below expected last week</small>
            <div class="pc__rows"><span>Expected</span><span>${yen(c.expected)}</span><span>Actual</span><span>${yen(c.actual)}</span></div>
            <i class="pc__scan"></i>
          </div>
        </div>
        <div class="peek__focus"></div>
        <span class="peek__cursor"><svg width="15" height="20" viewBox="0 0 15 20"><path d="M1.5 1.5v15l4-3.6 2.6 5.6 2.5-1.1-2.6-5.5h5.5Z" fill="#000" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg></span>
      </div>
      <div class="link">
        <b>Sales Forecast</b>
        <span class="link__sub"><span class="link__check"><svg width="8" height="8" viewBox="0 0 8 8"><path d="m1.3 4.2 1.7 1.7 3.7-3.9" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="shimmer" data-status>opening forecasting.html#sales</span></span>
      </div>
    </a>`;
}

function tween(el, from, to, ms) {
  if (reduceMotion) { el.textContent = yen(to); return; }
  const start = performance.now();
  const id = runId;
  const step = now => {
    if (id !== runId) return;
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = yen(Math.round((from + (to - from) * eased) / 100) * 100);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function centerOf(el) {
  return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
}

async function readForecast(card) {
  const peek = $('.peek', card);
  const status = $('[data-status]', card);
  const focus = $('.peek__focus', peek);
  const cursor = $('.peek__cursor', peek);
  const setStatus = text => { status.textContent = text; };

  const moveCursorTo = el => {
    const { x, y } = centerOf(el);
    cursor.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
  };
  const click = async el => {
    cursor.classList.add('click');
    const { x, y } = centerOf(el);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    peek.append(ripple);
    setTimeout(() => ripple.remove(), 600);
    await sleep(130);
    cursor.classList.remove('click');
  };
  const focusOn = el => {
    focus.style.opacity = '1';
    focus.style.width = el.offsetWidth + 6 + 'px';
    focus.style.height = el.offsetHeight + 6 + 'px';
    focus.style.transform = `translate(${el.offsetLeft - 3}px, ${el.offsetTop - 3}px)`;
  };

  await sleep(900);

  // 1. switch the forecast to Month
  setStatus('switching to month · nov 9–30');
  cursor.style.transform = `translate(${peek.offsetWidth - 30}px, ${peek.offsetHeight - 20}px)`;
  await sleep(30);
  cursor.style.opacity = '1';
  const monthTab = $('[data-mode="month"]', peek);
  moveCursorTo(monthTab);
  await sleep(800);
  await click(monthTab);
  $('[data-mode="day"]', peek).classList.remove('on');
  monthTab.classList.add('on');
  peek.querySelectorAll('[data-range]').forEach(el => { el.textContent = FORECAST.range.month; });
  FORECAST.machines.forEach(m => {
    const pc = $(`[data-card="${m.key}"]`, peek);
    tween($('[data-value]', pc), m.day, m.month, 750);
    tween($('[data-busy]', pc), m.dayBusy, m.monthBusy, 750);
    $('.pc__spark path', pc).setAttribute('d', SPARK.month);
    $('.pc__spark circle', pc).setAttribute('cy', '8');
  });
  await sleep(900);
  cursor.style.opacity = '0';

  // 2. read each machine off its graph
  for (const m of FORECAST.machines) {
    const pc = $(`[data-card="${m.key}"]`, peek);
    setStatus(`reading ${m.name.toLowerCase()} · ${yen(m.month)}`);
    focusOn(pc);
    await sleep(320);
    pc.classList.add('reading');
    await sleep(m.key === 'station' ? 950 : 700);
    pc.classList.remove('reading');
    pc.classList.add('read');
  }

  // 3. look for anything off
  const check = $('[data-card="check"]', peek);
  setStatus('checking for anything off');
  focusOn(check);
  await sleep(320);
  check.classList.add('reading');
  await sleep(850);
  check.classList.remove('reading');

  focus.style.opacity = '0';
  setStatus(`read ${FORECAST.range.month} · 3 machines`);
  $('.link', card).classList.add('done');
}

// ---------- the scene ----------
function reset() {
  runId++;
  thread.innerHTML = initialThread;
  fieldText.innerHTML = '';
  quicktype.innerHTML = initialQuicktype;
  quicktype.classList.remove('qt--mention');
  field.classList.remove('focus', 'typing');
  kb.classList.remove('open');
  send.classList.remove('press');
  refreshField();
  thread.scrollTop = thread.scrollHeight;
}

async function play() {
  reset();
  try {
    await sleep(700);

    // focus the field, keyboard slides up
    field.classList.add('focus');
    kb.classList.add('open');
    await sleep(520);
    scrollThread();

    // type the mention, accept the suggestion, type the question
    await typeText('@fore');
    await sleep(220);
    await acceptMention();
    await sleep(120);
    await typeText(QUESTION);
    await sleep(320);

    // send
    send.classList.add('press');
    await sleep(140);
    send.classList.remove('press');
    const sentHTML = fieldText.innerHTML;
    fieldText.innerHTML = '';
    refreshField();
    addStamp('Today', NOW);
    addRow('out', `<p class="bubble">${sentHTML}</p>`);
    const receipt = document.createElement('p');
    receipt.className = 'receipt fade-in';
    receipt.textContent = 'Delivered';
    thread.append(receipt);
    scrollThread();
    await sleep(420);
    field.classList.remove('focus');
    kb.classList.remove('open');
    await sleep(500);

    // Bean picks it up
    receipt.textContent = 'Read ' + NOW;
    let typing = showTyping();
    await sleep(1100);
    removeRow(typing);

    const card = addRow('in', peekMarkup());
    await readForecast(card);
    await sleep(500);

    // replies
    typing = showTyping();
    await sleep(1000);
    removeRow(typing);
    await popWords(addRow('in', `<p class="bubble">You’re expected to make about <mark class="pop pop--big" data-note="expected across Station, Office & Park · ${FORECAST.range.month}">${yen(MONTH_TOTAL)} this month</mark> (${FORECAST.range.month}) across all three machines.</p>`));
    await sleep(350);

    typing = showTyping();
    await sleep(850);
    removeRow(typing);
    const [station, office, park] = FORECAST.machines;
    await popWords(addRow('in', `<p class="bubble bubble--list">
      <span>${station.name}</span><b><mark class="pop pop--big" data-say="${station.name} · ${yen(station.month)}" data-note="your biggest machine · up to ${yen(station.monthBusy)} if it’s busy">${yen(station.month)}</mark></b><small>up to ${yen(station.monthBusy)} if it’s busy</small>
      <span>${office.name}</span><b><mark class="pop">${yen(office.month)}</mark></b>
      <span>${park.name}</span><b><mark class="pop">${yen(park.month)}</mark></b></p>`));
    await sleep(350);

    typing = showTyping();
    await sleep(1000);
    removeRow(typing);
    const c = FORECAST.check;
    await popWords(addRow('in', `<p class="bubble">Heads up: <mark class="pop pop--warn">${c.machine}</mark> came in <mark class="pop pop--warn pop--big" data-say="${c.machine} ${c.gap}% under last week" data-note="${yen(c.actual)} vs ${yen(c.expected)} expected · could be a jam">${c.gap}% under last week</mark> (${yen(c.actual)} vs ${yen(c.expected)} expected). Could be a jam, so it’s <mark class="pop pop--warn">worth a check</mark>.</p>`));
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error;
  }
}

$('#replay').addEventListener('click', play);
if (!/[?&]hold\b/.test(location.search)) play(); // ?hold: the walkthrough starts it when its step begins
