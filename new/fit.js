// Keep the home page on one screen (no vertical scroll on laptops and desktops).
// If the left column is taller than the window, the artifacts carousel shrinks first (it keeps
// its proportions), then "Your laundries" a little. Big screens are untouched; phones scroll as usual.
(() => {
  const root = document.documentElement;
  const left = document.querySelector(".gl__l");
  const right = document.querySelector(".gl__r");
  const panel = document.querySelector(".gl__panel");
  const lc = document.querySelector(".lc");
  if (!left || !panel) return;

  const MIN_PANEL = 0.5, MIN_LC = 0.82, BOTTOM = 18;
  const bottomOf = el => (el ? el.getBoundingClientRect().bottom + scrollY : 0);

  function fit() {
    panel.style.zoom = "";
    if (lc) lc.style.zoom = "";
    root.classList.remove("fits-screen");
    if (innerWidth < 900) return; // stacked phone layout keeps normal scrolling

    const need = () => Math.max(bottomOf(left), bottomOf(right)) + BOTTOM - innerHeight;
    let over = need();
    if (over > 0) {
      const h = panel.offsetHeight;
      panel.style.zoom = Math.max(MIN_PANEL + 0.12, (h - over) / h).toFixed(3); // carousel first, down to ~62%
      over = need();
    }
    if (over > 0 && lc) {
      const h = lc.offsetHeight;
      lc.style.zoom = Math.max(MIN_LC, (h - over) / h).toFixed(3); // then the laundries card, a little
      over = need();
    }
    if (over > 0) {
      const z = parseFloat(panel.style.zoom || 1), h = panel.offsetHeight; // offsetHeight is unzoomed
      panel.style.zoom = Math.max(MIN_PANEL, z - over / h).toFixed(3); // carousel the rest of the way
      over = need();
    }
    if (over <= 1) root.classList.add("fits-screen");
  }

  let frame = 0;
  const refit = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
  addEventListener("resize", refit);
  addEventListener("load", refit);
  document.fonts?.ready.then(refit);
  fit();
})();
