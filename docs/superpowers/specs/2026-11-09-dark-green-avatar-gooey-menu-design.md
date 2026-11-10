# Dark Green Avatar Gooey Menu Design

## Intent

Add the supplied `BotAvatar` as a dark-green, 96 px circular control at the bottom of the existing phone screen. Clicking the avatar should reveal a three-action fan using the liquid split/merge behavior demonstrated by Transitions.dev's “Gooey plus menu.”

## Goals

- Use the real `BotAvatar` component with `type="circle"`, `size={96}`, and `paused`.
- Place the avatar in the open space between the existing bottom controls without rewriting the static phone recreation.
- Open three circular actions upward-left, up, and upward-right; close them back into the avatar.
- Keep the avatar and liquid substrate dark forest green (`#123f2d`) with light icons.
- Expose the trigger as a semantic button with `aria-expanded`, keyboard activation, an Escape-to-close path, visible focus, and a reduced-motion fallback.

## Non-goals

- The three revealed buttons will demonstrate the interaction only; they will not create files, images, or folders.
- The rest of the phone screen, note content, and existing bottom controls will not be redesigned.
- The avatar remains paused as requested; the menu transition is the only added motion.

## Constraints

- Preserve the existing static HTML/CSS page and current responsive phone sizing.
- Use the published `bot-avatars` React package rather than drawing an imitation.
- Keep motion short, interruptible, transform/opacity-based, and disabled to a near-instant state change under `prefers-reduced-motion`.

## Approaches

1. **React island with an SVG goo substrate — selected.** Mount a small React component into the existing static page. A filtered SVG layer supplies the merging silhouette while real HTML buttons and the canvas avatar remain crisp and accessible. This honors the supplied import with minimal impact on the rest of the page.
2. **CSS-only avatar imitation.** Smaller dependency footprint, but it would not use the requested `BotAvatar` component and would lose the component's face/material rendering.
3. **Rewrite the whole page in React.** Technically straightforward, but unnecessarily risky and much larger than the requested interaction.

## Reference Lock

- **Primary interaction reference:** Transitions.dev “Gooey plus menu.” Preserve the center-trigger model, three-action upward fan, liquid bridges, plus/close state cue, and compact timing.
- **Existing product reference:** the current iPhone note recreation. Preserve its warm yellow stage, light glass controls, container-query sizing, and bottom-control geometry.
- **Borrow only:** the reference's fan geometry and liquid continuity; use the current page's visual language for scale, color, elevation, and icon weight.
- **Reject:** a full-screen menu, long springy movement, continuous avatar animation, blurred icon content, or controls that cannot be reached by keyboard.

## Token Commitments

- Avatar/liquid/action surface: `#123f2d`.
- Action icon: `#f5f4df`.
- Fast feedback: about `120ms`; fan transition: about `240ms` with emphasized ease-out.
- Avatar: exactly `96px`; action targets: at least `44px`.
- Reduced motion: no travel or morph; only an immediate visibility/state change.

