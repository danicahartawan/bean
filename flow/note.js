const STATUS_CHANGE_TIMES = [400, 900, 1_400];

export function getNoteStatus(value, elapsedMs) {
  if (!value.trim()) {
    return { phase: "idle", label: "" };
  }

  const elapsed = Math.max(0, Number(elapsedMs) || 0);

  if (elapsed < STATUS_CHANGE_TIMES[0]) {
    return { phase: "shimmer", label: "Thinking…" };
  }

  if (elapsed < STATUS_CHANGE_TIMES[1]) {
    return { phase: "thinking", label: "Finding context" };
  }

  if (elapsed < STATUS_CHANGE_TIMES[2]) {
    return { phase: "thinking", label: "Saving note" };
  }

  return { phase: "done", label: "✦ Saved" };
}

function motionMs(name, fallback) {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );

  return Number.isFinite(value) ? value : fallback;
}

function swapThinkingText(box, label) {
  const live = box.querySelector(".t-think-text:not(.is-exit)");

  if (live?.textContent === label) {
    return;
  }

  const swap = motionMs("--think-swap", 150);
  const gap = motionMs("--think-gap", 50);
  const leaving = live;

  leaving?.classList.add("is-exit");

  const next = document.createElement("span");
  next.className = "t-think-text is-enter-start";
  next.textContent = label;
  next.setAttribute("data-text", label);
  box.appendChild(next);

  const release = () => {
    void next.offsetWidth;
    next.classList.remove("is-enter-start");
  };

  if (gap > 0) {
    window.setTimeout(release, gap);
  } else {
    release();
  }

  if (leaving) {
    window.setTimeout(() => leaving.remove(), swap + gap);
  }
}

function renderNoteStatus(statusElement, status) {
  const shimmer = statusElement.querySelector(".t-shimmer");
  const thinking = statusElement.querySelector(".t-think");

  statusElement.dataset.phase = status.phase;
  shimmer.textContent = status.phase === "shimmer" ? status.label : "Thinking…";
  shimmer.setAttribute("data-text", shimmer.textContent);
  swapThinkingText(thinking, status.label);
}

function attachLiveNote() {
  const form = document.querySelector("#live-note-form");
  const input = document.querySelector("#live-note-input");
  const statusElement = document.querySelector("#live-note-status");

  if (!form || !input || !statusElement) {
    return;
  }

  let revision = 0;
  let timers = [];

  const clearTimers = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  };

  const restartStatus = () => {
    revision += 1;
    const currentRevision = revision;
    const value = input.value;

    clearTimers();
    renderNoteStatus(statusElement, getNoteStatus(value, 0));

    if (!value.trim()) {
      return;
    }

    timers = STATUS_CHANGE_TIMES.map((elapsed) =>
      window.setTimeout(() => {
        if (currentRevision === revision) {
          renderNoteStatus(statusElement, getNoteStatus(input.value, elapsed));
        }
      }, elapsed),
    );
  };

  const autosize = () => {
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  };

  // Keep the status on the line being typed, just after the last character.
  const placeStatus = () => {
    const style = getComputedStyle(input);
    const mirror = document.createElement("div");
    const marker = document.createElement("span");

    mirror.style.cssText = [
      "position:absolute",
      "visibility:hidden",
      "white-space:pre-wrap",
      "overflow-wrap:break-word",
      `width:${input.clientWidth}px`,
      `font:${style.font}`,
      `letter-spacing:${style.letterSpacing}`,
      `line-height:${style.lineHeight}`,
    ].join(";");
    mirror.textContent = input.value.replace(/\s+$/, "");
    marker.textContent = "\u200b";
    mirror.appendChild(marker);
    form.appendChild(mirror);

    form.style.setProperty("--status-top", `${input.offsetTop + marker.offsetTop}px`);
    mirror.remove();
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  input.addEventListener("input", () => {
    autosize();
    placeStatus();
    restartStatus();
  });
  restartStatus();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachLiveNote, { once: true });
  } else {
    attachLiveNote();
  }
}


const TITLE_TEXT = "Mon 11/9 Laundry Log";
const TITLE_COLORS = ["#8fae98"]; // the walkthrough types in one soft green (the original page flashes rainbow colours)

function attachTypingTitle() {
  const live = document.querySelector("#type-title-live");

  if (!live || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  let index = 0;

  const typeNext = () => {
    if (index >= TITLE_TEXT.length) {
      return;
    }

    const char = document.createElement("span");
    char.className = "tt-char";
    char.textContent = TITLE_TEXT[index];
    char.style.setProperty("--tt-color", TITLE_COLORS[Math.floor(Math.random() * TITLE_COLORS.length)]);
    live.appendChild(char);
    index += 1;
    window.setTimeout(typeNext, 110);
  };

  const calendar = document.querySelector("#tear-calendar");

  if (calendar && !calendar.classList.contains("is-gone")) {
    window.addEventListener("calendar-torn", typeNext, { once: true });
  } else {
    typeNext();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachTypingTitle, { once: true });
  } else {
    attachTypingTitle();
  }
}


function attachTearCalendar() {
  const calendar = document.querySelector("#tear-calendar");

  if (!calendar) {
    return;
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    calendar.classList.add("is-gone");
    return;
  }

  let torn = false;

  const tear = () => {
    if (torn) return;
    torn = true;
    calendar.classList.add("is-tearing");
    window.setTimeout(() => window.dispatchEvent(new Event("calendar-torn")), 800);
    window.setTimeout(() => calendar.classList.add("is-gone"), 1750);
  };

  calendar.addEventListener("click", tear);
  calendar.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      tear();
    }
  });
  window.setTimeout(tear, 2400);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachTearCalendar, { once: true });
  } else {
    attachTearCalendar();
  }
}


// Pixel-mosaic dissolve: a churning grid of colour cells resolves into the photo.
function runPixelDissolve(canvas, imageUrl, onDone) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));

  const ctx = canvas.getContext("2d");
  const cell = Math.max(6, Math.round(canvas.width / 16));
  const cols = Math.ceil(canvas.width / cell);
  const rows = Math.ceil(canvas.height / cell);
  const duration = 1500;
  const palette = ["#1f3a2a", "#34553a", "#5f7f4a", "#86a063", "#c9d6b8", "#e9eedf"];
  const cells = Array.from({ length: cols * rows }, () => ({
    at: 0.15 + Math.random() * 0.8,
    seed: Math.floor(Math.random() * palette.length),
  }));
  const start = performance.now();

  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cells.forEach((c, i) => {
      if (t >= c.at) return;
      const flicker = Math.floor(now / 70 + c.seed + i) % palette.length;
      const fade = Math.min(1, (c.at - t) / 0.12);
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = palette[flicker];
      ctx.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
    });

    ctx.globalAlpha = 1;
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      onDone();
    }
  };

  requestAnimationFrame(frame);
}

function createPhoto() {
  const photo = document.createElement("div");
  const image = document.createElement("div");
  const canvas = document.createElement("canvas");
  const beam = document.createElement("span");

  photo.className = "note-photo";
  photo.setAttribute("role", "img");
  photo.setAttribute("aria-label", "Photo");
  image.className = "note-photo__img";
  image.style.setProperty("--photo", 'url("../assets/forest.jpg")');
  canvas.className = "note-photo__fx";
  beam.className = "note-photo__beam";
  beam.setAttribute("aria-hidden", "true");
  image.appendChild(canvas);
  photo.append(image, beam);

  canvas.remove();
  beam.remove();

  return photo;
}

function attachFakeCamera() {
  const camera = document.querySelector("#camera");
  const video = document.querySelector("#camera-video");
  const shot = document.querySelector("#screen-photo");
  const beam = document.querySelector("#screen-beam");
  const status = document.querySelector("#bean-status");
  const collect = document.querySelector("#entry-collect");
  const collectText = document.querySelector("#entry-collect-text");
  const collectTotal = document.querySelector("#entry-collect-total");
  const safe = document.querySelector("#entry-safe");
  const toast = document.querySelector("#artifacts-toast");
  const sheet = document.querySelector("#artifacts");
  const sheetClose = document.querySelector("#artifacts-close");
  const totalP = document.querySelector("#total-p");

  if (!camera || !video || !shot || !beam || !status || !collect || !collectText || !collectTotal || !safe || !toast || !sheet) {
    return;
  }

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  let running = false;

  const setCamera = (open) => {
    camera.classList.toggle("is-open", open);
    camera.setAttribute("aria-hidden", String(!open));
  };

  const setStatus = (text) => {
    status.textContent = text;
    status.classList.toggle("is-on", Boolean(text));
  };

  const openSheet = (open) => {
    sheet.classList.toggle("is-open", open);
    sheet.setAttribute("aria-hidden", String(!open));
  };

  const countUp = (el, from, to, ms) => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      el.textContent = String(Math.round(from + (to - from) * t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Same colour-flash typing as the title, settling to green.
  const typeInto = (el, text) => {
    el.textContent = "";
    el.hidden = false;
    [...text].forEach((ch, i) => {
      window.setTimeout(() => {
        const span = document.createElement("span");
        span.className = "tt-char tt-char--link";
        span.textContent = ch;
        span.style.setProperty("--tt-color", TITLE_COLORS[Math.floor(Math.random() * TITLE_COLORS.length)]);
        el.appendChild(span);
      }, reduced ? 0 : i * 60);
    });
  };

  const run = async () => {
    if (running) return;
    running = true;

    // 1. The recorded camera clip plays full screen.
    safe.hidden = true;
    safe.classList.remove("is-updated");
    collect.classList.remove("is-updated");
    collectText.innerHTML = "collected 680 dollars from washers<br>240 dollars dryers";
    collectTotal.textContent = "+920";
    toast.hidden = true;
    toast.textContent = "";
    setStatus("");
    video.currentTime = 0;
    video.playbackRate = 1.25; // the flow plays the clip a little faster
    setCamera(true);
    try {
      await video.play();
      await new Promise((resolve) => {
        video.addEventListener("ended", resolve, { once: true });
        window.setTimeout(resolve, 3400);
      });
    } catch {
      await wait(900);
    }

    // 2. The last frame fades back into the note; the beam rides the screen edge while Bean works.
    shot.classList.remove("is-fading");
    void shot.offsetWidth;
    shot.classList.add("is-showing");
    setCamera(false);
    await wait(320);
    shot.classList.add("is-fading");
    beam.classList.remove("is-on");
    void beam.offsetWidth;
    if (!reduced) beam.classList.add("is-on");

    // 3. Hardcoded thinking states beside the bean.
    await wait(450);
    shot.classList.remove("is-showing", "is-fading");
    setStatus("Reading your photo…");
    await wait(1200);
    setStatus("Finding 4 records…");
    await wait(1050);
    setStatus("Updating 3 artifacts…");
    await wait(1050);
    setStatus("");

    // 4. New lines land in the notebook, highlighted, and the books update.
    collectText.innerHTML =
      "collected 860 dollars from washers<br>265 dollars dryers<br>15 dollars soap machine";
    collectTotal.textContent = "+1,140";
    collect.classList.remove("is-updated");
    void collect.offsetWidth;
    collect.classList.add("is-updated");
    await wait(320);
    safe.hidden = false;
    void safe.offsetWidth;
    safe.classList.add("is-updated");
    if (totalP) countUp(totalP, 790, 1010, 900);
    await wait(1000);
    typeInto(toast, "3 artifacts updated");
    beam.classList.remove("is-on");
    running = false;
  };

  window.addEventListener("open-camera", run);
  toast.addEventListener("click", () => openSheet(true));
  toast.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSheet(true);
    }
  });
  sheetClose?.addEventListener("click", () => openSheet(false));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachFakeCamera, { once: true });
  } else {
    attachFakeCamera();
  }
}

// "Updating model" shimmers for 5 seconds, then reads "Updated!".
function attachUpdatedStatus() {
  const status = document.querySelector(".entry__status--thinking");

  if (!status) {
    return;
  }

  window.setTimeout(() => {
    status.textContent = "Updated!";
    status.classList.remove("entry__status--thinking");
    status.classList.add("entry__status--result", "entry__status--done");
  }, 5000);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachUpdatedStatus, { once: true });
  } else {
    attachUpdatedStatus();
  }
}

function attachDeposit() {
  const dep = document.querySelector("#dep");
  if (!dep) return;
  const $ = (s) => dep.querySelector(s);
  const num = $("#dep-num"), amount = $("#dep-amount"), swipe = $("#dep-swipe"), knob = $("#dep-knob");
  const note = document.querySelector("#live-note-input");
  let raw = "";
  const fmt = (r) => {
    if (!r) return "0";
    const [i, d] = r.split(".");
    return Number(i || 0).toLocaleString("en-US") + (d !== undefined ? "." + d : "");
  };
  const render = () => {
    num.textContent = fmt(raw);
    amount.classList.toggle("is-zero", !raw || Number(raw) === 0);
    num.style.fontSize = raw.length > 7 ? "0.7em" : "";
  };
  const resetKnob = (snap) => {
    swipe.classList.toggle("is-snap", !!snap);
    knob.style.setProperty("--x", "0px");
    swipe.style.setProperty("--fill", "0px");
    swipe.classList.remove("is-ready");
  };
  const show = (id) => ["#dep-entry", "#dep-busy", "#dep-done"].forEach((s) => ($(s).hidden = s !== id));
  const open = () => {
    raw = ""; render(); resetKnob(false); show("#dep-entry");
    dep.classList.remove("is-busy", "is-done");
    dep.classList.add("is-open");
    dep.setAttribute("aria-hidden", "false");
  };
  const close = () => {
    dep.classList.remove("is-open", "is-busy", "is-done");
    dep.setAttribute("aria-hidden", "true");
  };
  const confirm = () => {
    if (!raw || Number(raw) === 0) { resetKnob(true); return; }
    const value = Number(raw);
    show("#dep-busy");
    dep.classList.add("is-busy");
    setTimeout(() => {
      $("#dep-total").textContent = "$" + value.toLocaleString("en-US", { maximumFractionDigits: 2 });
      show("#dep-done");
      dep.classList.add("is-done");
      dep.classList.remove("is-busy");
      if (note) {
        note.value = (note.value ? note.value + "\n" : "") + `deposited ${value.toLocaleString("en-US")} dollars at bank`;
        note.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setTimeout(close, 2600);
    }, 2300);
  };
  dep.querySelectorAll(".dep__key").forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.key;
      if (k === "back") raw = raw.slice(0, -1);
      else if (k === ".") { if (!raw.includes(".")) raw = (raw || "0") + "."; }
      else if (raw.replace(".", "").length < 9 && !(raw.includes(".") && raw.split(".")[1].length >= 2)) raw = raw === "0" ? k : raw + k;
      render();
    })
  );
  $("#dep-back").addEventListener("click", close);
  let startX = null, max = 0;
  knob.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    max = swipe.clientWidth - knob.offsetWidth - knob.offsetLeft * 2;
    swipe.classList.remove("is-snap");
    knob.setPointerCapture(e.pointerId);
  });
  knob.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    const x = Math.max(0, Math.min(max, e.clientX - startX));
    knob.style.setProperty("--x", x + "px");
    swipe.style.setProperty("--fill", x + knob.offsetWidth + "px");
    swipe.classList.toggle("is-ready", x > max * 0.85);
  });
  const end = (e) => {
    if (startX === null) return;
    const x = Math.max(0, e.clientX - startX);
    startX = null;
    if (x > max * 0.85) confirm(); else resetKnob(true);
  };
  knob.addEventListener("pointerup", end);
  knob.addEventListener("pointercancel", end);
  knob.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); confirm(); } });
  window.addEventListener("open-calculator", open);
}
if (typeof document !== "undefined") attachDeposit();


const AUTO_NOTE = "tipped the repair guy 20 dollars";

function attachAutoNote() {
  const input = document.querySelector("#live-note-input");

  if (!input) {
    return;
  }

  const run = () => {
    if (input.value) {
      return;
    }
    let i = 0;
    const step = () => {
      if (input.value && i === 0) {
        return;
      }
      if (i >= AUTO_NOTE.length) {
        return;
      }
      input.value = AUTO_NOTE.slice(0, ++i);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      window.setTimeout(step, 55);
    };
    step();
  };

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const calendar = document.querySelector("#tear-calendar");
  const start = () => window.setTimeout(run, reduced ? 0 : 2600);

  if (calendar && !calendar.classList.contains("is-gone")) {
    window.addEventListener("calendar-torn", start, { once: true });
  } else {
    start();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachAutoNote, { once: true });
  } else {
    attachAutoNote();
  }
}
