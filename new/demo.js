// Plays the "Today's books" walkthrough as a card, then returns to the home page.
// - /demo/ or /new/?demo          plays the full walkthrough by itself (for presenting); skips /hello/
// - anywhere else                 never plays by itself; click the card to watch it
// Either way, when it ends it fades out and shrinks back into its card.
(() => {
  if (window.self !== window.top) return; // e.g. the Ask Bean step loads this page inside the walkthrough
  const card = document.querySelector('.card[data-frame$="flow/"]');
  const frame = document.getElementById("frame");
  if (!card || !frame) return;
  // the walkthrough says when it's finished (after fading itself out); shrink straight back into its card
  addEventListener("message", (event) => {
    if (event.origin !== location.origin || !event.data || event.data.bean !== "flow-done") return;
    if (frame.hidden || !/\/flow\//.test(frame.querySelector("iframe")?.src || "")) return;
    frame.querySelector(".fr__x")?.click();
  });
  if (!/[?&]demo\b/.test(location.search)) return; // only plays by itself on the demo link

  const start = () => card.click(); // opens like a normal card: grows out of it into the full-screen view
  // wait for the bean intro to finish first
  const afterIntro = () => (document.getElementById("bean-entry") ? setTimeout(afterIntro, 200) : setTimeout(start, 700));
  afterIntro();
})();
