// Step 2 of the flow: confirm each number Bean read from the evening slip.
// Same figures as the books: washers 180, dryers 25, soap machine 15 (adds $220 to this morning's $920).
(() => {
  const READS = [
    { key: 'washers', label: 'Washers', value: 180 },
    { key: 'dryers', label: 'Dryers', value: 25 },
    { key: 'soap', label: 'Soap machine', value: 15 },
  ];
  const MORNING = 920;
  const ok = new Set();
  const list = document.getElementById('reads');
  const dollars = n => '$' + n.toLocaleString('en-US');

  const tell = () => {
    if (window.parent === window) return;
    window.parent.postMessage({ bean: ok.size === READS.length ? 'checked' : 'unchecked' }, location.origin);
  };

  function totals() {
    const evening = READS.reduce((sum, r) => sum + r.value, 0);
    document.getElementById('evening-total').textContent = dollars(evening);
    document.getElementById('day-total').textContent =
      `With this morning’s ${dollars(MORNING)}, Monday comes to ${dollars(MORNING + evening)} collected.`;
  }

  function row(read) {
    const li = document.createElement('li');
    li.className = 'read' + (ok.has(read.key) ? ' is-ok' : '');
    li.innerHTML = `
      <div><span class="read__label">${read.label}</span><strong class="read__value">${dollars(read.value)}</strong></div>
      <div class="read__actions">
        ${ok.has(read.key) ? '<span class="tag tag--green">Checked</span>' : '<button type="button" data-ok>Looks right</button>'}
        <button type="button" class="quiet" data-fix>Fix</button>
      </div>`;
    li.querySelector('[data-ok]')?.addEventListener('click', () => { ok.add(read.key); draw(); tell(); });
    li.querySelector('[data-fix]').addEventListener('click', () => {
      if (li.querySelector('.read__fix')) return;
      const fix = document.createElement('div');
      fix.className = 'read__fix';
      fix.innerHTML = `<label for="fix-${read.key}">Correct amount $</label>
        <input id="fix-${read.key}" type="number" inputmode="numeric" min="0" value="${read.value}" />
        <button type="button">Save</button>`;
      li.append(fix);
      const input = fix.querySelector('input');
      input.focus(); input.select();
      const save = () => {
        const n = Math.max(0, Math.round(Number(input.value) || 0));
        read.value = n; ok.add(read.key); draw(); tell();
      };
      fix.querySelector('button').addEventListener('click', save);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    });
    return li;
  }

  function draw() {
    list.replaceChildren(...READS.map(row));
    totals();
  }

  // the flow's "Everything looks right" button calls this
  window.confirmAll = () => { READS.forEach(r => ok.add(r.key)); draw(); tell(); };
  // the flow's animation ticks rows off one at a time
  window.confirmOne = i => { if (READS[i]) { ok.add(READS[i].key); draw(); list.children[i]?.classList.add('just-ok'); tell(); } };
  window.resetChecks = () => { ok.clear(); draw(); tell(); };
  // the flow calls this as the step appears: the phone starts where step 1's phone was (the middle),
  // holds there while the step fades in, then slides over as Bean's readings appear beside it
  window.arrive = () => {
    const phone = document.getElementById('cphone'), read = document.querySelector('.check__read');
    phone.getAnimations().forEach(a => a.cancel()); read.getAnimations().forEach(a => a.cancel());
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth <= 760) return;
    const r = phone.getBoundingClientRect();
    const dx = innerWidth / 2 - (r.left + r.width / 2);
    const t = { duration: 1900, easing: 'cubic-bezier(.45,.05,.2,1)' };
    phone.animate([{ transform: `translateX(${dx}px)` }, { transform: `translateX(${dx}px)`, offset: .42 }, { transform: 'none' }], t);
    read.animate([{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 0, transform: 'translateX(18px)', offset: .5 }, { opacity: 1, transform: 'none' }], { ...t, easing: 'cubic-bezier(.33,0,.2,1)' });
  };
  draw();
})();
