# Dark Green Avatar Gooey Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paused dark-green `BotAvatar` at the bottom of the phone that opens and closes a three-action gooey fan.

**Architecture:** Keep the existing page static and mount one React island into a new bottom-center host. The component separates a filtered SVG liquid layer from crisp semantic buttons and the canvas avatar, with CSS controlling the open/closed geometry.

**Tech Stack:** React, `bot-avatars`, Vite, Vitest, Testing Library, HTML, CSS, SVG filters

**Spec:** `docs/superpowers/specs/2026-11-09-dark-green-avatar-gooey-menu-design.md`

## Global Constraints

- Preserve the existing phone recreation and its responsive container-query sizing.
- Use `BotAvatar type="circle" size={96} paused` with dark-green color `#123f2d`.
- The three action buttons are demonstrative and do not perform file operations.
- Support keyboard activation, Escape-to-close, visible focus, and `prefers-reduced-motion`.

## Review Focus

- Closed state must keep hidden actions out of the tab order.
- Repeated rapid clicks must always reflect the latest open/closed state.
- Escape must close the fan and return focus to the avatar trigger.
- The 96 px trigger must not cover the existing Visit Site or Visual Search controls at the narrow phone size.
- Reduced motion must remove fan travel without hiding the final open state.

---

### Task 1: React island and interaction contract

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `src/avatar-menu.jsx`
- Create: `src/main.jsx`
- Create: `tests/avatar-menu.test.jsx`
- Modify: `index.html`

**Interfaces:**
- Consumes: the existing `#bot-avatar-menu-root` host in `index.html` and `BotAvatar` from `bot-avatars`.
- Produces: `AvatarGooeyMenu`, a bottom-center menu whose trigger owns `aria-expanded` and whose three actions become keyboard-reachable only while open.

- [ ] **Step 1: Write the failing component tests**

Test that the trigger starts collapsed, clicking opens three named actions and admits them to the tab order, a second click closes them, and Escape closes the menu while restoring trigger focus.

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm run test:unit -- tests/avatar-menu.test.jsx`

Expected: FAIL because `src/avatar-menu.jsx` does not exist yet.

- [ ] **Step 3: Implement the minimal React island**

Create `AvatarGooeyMenu()` with internal boolean state, a `BotAvatar` trigger, three semantic action buttons, `aria-expanded`, dynamic tab order, and Escape handling. Mount it from `src/main.jsx` into `#bot-avatar-menu-root`.

- [ ] **Step 4: Run the component test to verify it passes**

Run: `npm run test:unit -- tests/avatar-menu.test.jsx`

Expected: PASS.

### Task 2: Liquid fan styling and responsive placement

**Files:**
- Create: `src/avatar-menu.css`
- Modify: `styles.css`
- Modify: `tests/page.test.mjs`

**Interfaces:**
- Consumes: the component state class and per-action CSS custom properties from Task 1.
- Produces: the SVG goo substrate, crisp action layer, bottom-center placement, focus/press states, and reduced-motion behavior.

- [ ] **Step 1: Write the failing static contract test**

Assert that the page exposes the React mount, module entry point, and a named “Open quick actions” control in the rendered source/component contract.

- [ ] **Step 2: Run tests to verify the new contract fails**

Run: `npm run test:static`

Expected: FAIL until the host and module entry point are present.

- [ ] **Step 3: Implement the filtered substrate and placement**

Use one SVG filter layer with a center circle and three transformable action circles. Keep real buttons outside the filter. Position the 96 px avatar at bottom center between the existing controls and fan actions upward at 240 ms.

- [ ] **Step 4: Add reduced-motion and focus behavior**

Remove travel and transition duration under `prefers-reduced-motion`, retain visible end states, and use `:focus-visible` rings for every control.

- [ ] **Step 5: Run the full automated suite and production build**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite build exits 0.

- [ ] **Step 6: Verify in a browser**

Confirm the closed and open states at desktop and narrow phone widths, keyboard/Escape behavior, no overlap with existing controls, and no console errors.

