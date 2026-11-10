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
        <button type="button" class="btn btn--ok" data-ok>${ok.has(read.key) ? '✓ Right' : 'Looks right'}</button>
        <button type="button" class="btn" data-fix>Fix</button>
      </div>
      ${ok.has(read.key) ? '<p class="read__state">Checked</p>' : ''}`;
    li.querySelector('[data-ok]').addEventListener('click', () => { ok.add(read.key); draw(); tell(); });
    li.querySelector('[data-fix]').addEventListener('click', () => {
      if (li.querySelector('.read__fix')) return;
      const fix = document.createElement('div');
      fix.className = 'read__fix';
      fix.innerHTML = `<label for="fix-${read.key}">Correct amount $</label>
        <input id="fix-${read.key}" type="number" inputmode="numeric" min="0" value="${read.value}" />
        <button type="button" class="btn btn--primary">Save</button>`;
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
  draw();
})();
