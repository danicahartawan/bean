// Vertical tab bar shown on every page.
// Collapsed it is an icon rail; expanded it shows labels, and groups list their
// pages on a connecting line. It opens on hover; press "\" or click the logo to keep it open.
import './sitenav.css';

const ICONS = {
  home: '<path d="M3.5 9.2 10 4l6.5 5.2V16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z"/><path d="M8 17v-4.5h4V17"/>',
  agent: '<path d="M10 3.2c.5 3.3 1.9 4.7 5.2 5.2-3.3.5-4.7 1.9-5.2 5.2-.5-3.3-1.9-4.7-5.2-5.2 3.3-.5 4.7-1.9 5.2-5.2Z"/><path d="M15 13.2c.2 1.3.8 1.9 2.1 2.1-1.3.2-1.9.8-2.1 2.1-.2-1.3-.8-1.9-2.1-2.1 1.3-.2 1.9-.8 2.1-2.1Z"/>',
  artifacts: '<rect x="3.5" y="4" width="13" height="12" rx="2"/><path d="M3.5 8h13M8 8v8"/>',
  forecasting: '<path d="M3.5 16.5h13"/><path d="M4.5 13 8 9.5l3 2.5 4.5-5.5"/><path d="M12.8 6.5h2.7v2.7"/>',
  import: '<path d="M10 3.5v8.5M6.8 8.8 10 12l3.2-3.2"/><path d="M3.5 12.5v2.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-2.5"/>',
  mobile: '<rect x="6" y="2.8" width="8" height="14.4" rx="2"/><path d="M9 14.6h2"/>',
  sheet: '<rect x="4.5" y="3.5" width="11" height="13" rx="1.6"/><path d="M7.5 7.5h5M7.5 10h5M7.5 12.5h3"/>',
  chart: '<path d="M4.5 16V9M8.5 16V5M12.5 16v-5M16 16H3.5"/>',
  phone: '<rect x="6.5" y="3.5" width="7" height="13" rx="1.8"/>',
  collapse: '<path d="M12.5 5.5 8 10l4.5 4.5"/>',
  flow: '<path d="M4 5.5h1.5M4 10h1.5M4 14.5h1.5"/><path d="M8.5 5.5H16M8.5 10H16M8.5 14.5H13"/>',
};
const icon = (name, size = 20) => `<svg class="vtab__icon" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">${ICONS[name]}</svg>`;

const TABS = [
  { id: 'home', label: 'Home', icon: 'home', href: '/new/' },
  { id: 'flow', label: "Today's books", icon: 'flow', href: '/flow/' },
  { id: 'agent', label: 'Agent', icon: 'agent', href: '/new/#agent' },
  { id: 'artifacts', label: 'Artifacts', icon: 'artifacts', children: [
    { label: 'Profit & Loss', icon: 'sheet', href: '/bookkeeper/#sheet=pnl' },
    { label: 'Cash Reconciliation', icon: 'sheet', href: '/bookkeeper/#sheet=recon' },
    { label: 'Income & Expense Ledger', icon: 'sheet', href: '/bookkeeper/#sheet=ledger' },
    { label: 'Bookkeeper Package', icon: 'sheet', href: '/bookkeeper/#sheet=journal' },
  ] },
  { id: 'artifacts-v2', label: 'Artifacts v2', icon: 'artifacts', children: [
    { label: 'Profit & Loss', icon: 'sheet', href: '/bookkeeper-v2/#sheet=pnl' },
    { label: 'Cash Reconciliation', icon: 'sheet', href: '/bookkeeper-v2/#sheet=recon' },
    { label: 'Income & Expense Ledger', icon: 'sheet', href: '/bookkeeper-v2/#sheet=ledger' },
    { label: 'Bookkeeper Package', icon: 'sheet', href: '/bookkeeper-v2/#sheet=journal' },
  ] },
  { id: 'forecasting', label: 'Forecasting', icon: 'forecasting', children: [
    { label: 'Sales', icon: 'chart', href: '/forecasting.html' },
    { label: 'Product Trends', icon: 'chart', href: '/forecasting.html#products' },
    { label: 'Depreciation', icon: 'chart', href: '/forecasting.html#depreciation' },
  ] },
  { id: 'import', label: 'Import', icon: 'import', href: '/#import' },
  { id: 'mobile', label: 'Mobile', icon: 'mobile', children: [
    { label: 'Laundry Log', icon: 'phone', href: '/' },
    { label: 'Messaging', icon: 'phone', href: '/messaging/' },
  ] },
];

// Site base: '/' locally, '/bean/' on GitHub Pages. Links above are written from the site root.
const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const at = path => BASE + path;

// Pages that only read their hash on load need a reload to switch views.
const RELOAD_ON_HASH = [at('/forecasting.html')];
const STORE_KEY = 'bean.vtabs.expanded';

function normalPath(path) { return path.replace(/\/index\.html$/, '/') || '/'; }
function isCurrent(href) {
  const url = new URL(href, location.origin);
  if (normalPath(url.pathname) !== normalPath(location.pathname)) return false;
  const here = location.hash === '#' ? '' : location.hash;
  if (url.pathname === at('/forecasting.html') && !url.hash) return !here || here === '#sales';
  if (url.pathname === at('/flow/') && !url.hash) return true; // the flow's steps live in its hash
  return url.hash === here;
}
const remember = value => { try { localStorage.setItem(STORE_KEY, value ? '1' : '0'); } catch {} };
const recall = () => { try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; } };

function mount() {
  if (window.self !== window.top || /[?&]embed/.test(location.search)) return; // no rail inside embedded pages
  document.documentElement.classList.add('has-vtabs');
  const rail = document.createElement('nav');
  rail.className = 'vtabs';
  rail.setAttribute('aria-label', 'Bean');
  rail.innerHTML = `
    <div class="vtabs__head">
      <span class="vtabs__brand"><img src="${at('/assets/bean-avatar.png')}" alt="" /><span>bean</span></span>
      <button class="vtabs__toggle" type="button" aria-label="Expand menu" aria-expanded="false">${icon('collapse', 18)}</button>
    </div>
    <ul class="vtabs__list">
      ${TABS.map(tab => `
        <li class="vtab${tab.children ? ' vtab--group' : ''}${tab.soon ? ' vtab--soon' : ''}" data-tab="${tab.id}">
          ${tab.children
            ? `<button class="vtab__row" type="button" aria-expanded="false" data-label="${tab.label}">${icon(tab.icon)}<span class="vtab__label">${tab.label}</span><i class="vtab__sign" aria-hidden="true"></i></button>
               <ul class="vtab__children">${tab.children.map(child => `
                 <li><a class="vtab__child" href="${at(child.href)}">${icon(child.icon, 18)}<span>${child.label}</span></a></li>`).join('')}
               </ul>
               <div class="vtab__dots" aria-hidden="true">${tab.children.map(child => `<a href="${at(child.href)}" tabindex="-1" data-label="${child.label}"><i></i></a>`).join('')}</div>`
            : tab.soon
              ? `<span class="vtab__row" aria-disabled="true" data-label="${tab.label} · soon">${icon(tab.icon)}<span class="vtab__label">${tab.label}</span><em class="vtab__badge">soon</em></span>`
              : `<a class="vtab__row" href="${at(tab.href)}" data-label="${tab.label}">${icon(tab.icon)}<span class="vtab__label">${tab.label}</span></a>`}
        </li>`).join('')}
    </ul>
    <p class="vtabs__hint"><kbd>\\</kbd><span>to keep it open</span></p>`;
  document.body.append(rail);

  const toggle = rail.querySelector('.vtabs__toggle');
  const expanded = () => rail.classList.contains('is-expanded');
  const setExpanded = (open, save = true) => {
    rail.classList.toggle('is-expanded', open);
    document.documentElement.classList.toggle('vtabs-expanded', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (save) remember(open);
  };
  const setGroupOpen = (li, open) => {
    li.classList.toggle('is-open', open);
    li.querySelector('.vtab__row').setAttribute('aria-expanded', String(open));
  };

  const markCurrent = () => {
    rail.querySelectorAll('a[href]').forEach(a => {
      const current = isCurrent(a.getAttribute('href'));
      a.classList.toggle('is-current', current);
      if (current && !a.closest('.vtab__dots')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    rail.querySelectorAll('.vtab--group').forEach(li => {
      const active = Boolean(li.querySelector('.vtab__child.is-current'));
      li.classList.toggle('is-active', active);
      if (active) setGroupOpen(li, true);
    });
  };

  // tooltips for the collapsed rail sit beside the hovered item
  rail.addEventListener('pointerover', event => {
    const target = event.target.closest('[data-label]');
    if (!target || expanded()) return;
    const r = target.getBoundingClientRect();
    rail.style.setProperty('--tip-y', r.top + r.height / 2 + 'px');
  });

  // "Pinned" = kept open by the logo button or "\". Otherwise the rail opens
  // while the pointer (or keyboard focus) is on it and closes when it leaves.
  let pinned = recall();
  const pin = value => {
    pinned = value;
    rail.classList.toggle('is-pinned', pinned);
    setExpanded(pinned || rail.matches(':hover'), false);
    remember(pinned);
    toggle.setAttribute('aria-label', pinned ? 'Unpin menu' : 'Keep menu open');
  };
  setExpanded(pinned, false);
  rail.classList.toggle('is-pinned', pinned);
  toggle.setAttribute('aria-label', pinned ? 'Unpin menu' : 'Keep menu open');
  markCurrent();

  const canHover = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 641px)');
  let hoverTimer = 0;
  const hoverTo = (open, delay) => {
    clearTimeout(hoverTimer);
    if (pinned) return;
    hoverTimer = setTimeout(() => { if (!pinned) setExpanded(open, false); }, delay);
  };
  rail.addEventListener('pointerenter', () => { if (canHover.matches) hoverTo(true, 90); });
  rail.addEventListener('pointerleave', () => { if (canHover.matches) hoverTo(false, 220); });
  rail.addEventListener('focusin', () => hoverTo(true, 0));
  rail.addEventListener('focusout', event => { if (!rail.contains(event.relatedTarget)) hoverTo(false, 0); });

  toggle.addEventListener('click', () => pin(!pinned));
  rail.querySelectorAll('.vtab--group > .vtab__row').forEach(row => row.addEventListener('click', () => {
    const li = row.parentElement;
    if (!expanded()) { setExpanded(true, false); setGroupOpen(li, true); return; }
    setGroupOpen(li, !li.classList.contains('is-open'));
  }));

  document.addEventListener('keydown', event => {
    const typing = event.target.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    if (event.key === '\\' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      pin(!pinned);
    }
  });

  rail.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const url = new URL(link.href);
    if (normalPath(url.pathname) !== normalPath(location.pathname)) return; // normal navigation
    event.preventDefault();
    if (RELOAD_ON_HASH.includes(url.pathname)) {
      if (url.hash) location.replace(url.href); else history.replaceState(null, '', url.pathname);
      location.reload();
      return;
    }
    if (url.hash === location.hash || (!url.hash && !location.hash)) {
      window.dispatchEvent(new HashChangeEvent('hashchange')); // re-route (e.g. reopen the agent)
    } else if (url.hash) {
      location.hash = url.hash;
    } else {
      history.pushState(null, '', url.pathname);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    markCurrent();
  }));

  addEventListener('hashchange', markCurrent);
  addEventListener('popstate', markCurrent);
}

// Not inside embedded frames (the bookkeeper is shown in iframes on other pages).
const embedded = window.self !== window.top || document.documentElement.classList.contains('embed') || /[?&]embed/.test(location.search);
if (embedded) document.documentElement.classList.add('is-embedded');
else mount();
