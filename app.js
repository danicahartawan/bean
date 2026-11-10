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


const TITLE_TEXT = "Mon 9/11 Laundry Log";
const TITLE_COLORS = ["#ff4fd8", "#a56bff", "#ffa23a", "#5ec7d0", "#f0c040", "#ff6fa8"];

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
    window.setTimeout(typeNext, 75);
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
  image.style.setProperty("--photo", 'url("./assets/forest.jpg")');
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
  const shutter = document.querySelector("#camera-shutter");
  const close = document.querySelector("#camera-close");
  const photos = document.querySelector("#note-photos");

  if (!camera || !shutter || !close || !photos) {
    return;
  }

  const setOpen = (open) => {
    camera.classList.toggle("is-open", open);
    camera.setAttribute("aria-hidden", String(!open));
  };

  window.addEventListener("open-camera", () => setOpen(true));
  close.addEventListener("click", () => setOpen(false));

  shutter.addEventListener("click", () => {
    camera.classList.remove("is-flashing");
    void camera.offsetWidth;
    camera.classList.add("is-flashing");

    window.setTimeout(() => {
      const shot = document.querySelector("#screen-photo");
      const beam = document.querySelector("#screen-beam");
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const addThumb = () => photos.appendChild(createPhoto());

      setOpen(false);

      if (!shot || !beam || reduced) {
        addThumb();
        return;
      }

      // The photo fills the whole screen, then dissolves into the note; the beam then rides the screen edge.
      shot.classList.remove("is-fading");
      beam.classList.remove("is-on");
      void shot.offsetWidth;
      shot.classList.add("is-showing");

      window.setTimeout(() => {
        shot.classList.add("is-fading");
        addThumb();
      }, 900);

      window.setTimeout(() => {
        shot.classList.remove("is-showing", "is-fading");
        beam.classList.add("is-on");
      }, 900 + 1100);

      window.setTimeout(() => beam.classList.remove("is-on"), 900 + 1100 + 3700);
    }, 220);
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachFakeCamera, { once: true });
  } else {
    attachFakeCamera();
  }
}
