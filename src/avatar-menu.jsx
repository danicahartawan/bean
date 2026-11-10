import { useRef, useState } from "react";
import { BotAvatar } from "bot-avatars";

import "./avatar-menu.css";

const actions = [
  { name: "Camera", x: "-50px", y: "62px", icon: "camera" },
  { name: "Add image", x: "0px", y: "88px", icon: "image" },
  { name: "New folder", x: "50px", y: "62px", icon: "folder" },
];

function ActionIcon({ icon }) {
  if (icon === "image") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.2" cy="8.2" r="1.7" />
        <path d="m4 18 5.2-5.2 3.4 3.4 2.2-2.2 5.2 5.2" />
      </svg>
    );
  }

  if (icon === "camera") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .8-.4L9.6 4h4.8l1.1 1.6a1 1 0 0 0 .8.4h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
        <circle cx="12" cy="12.5" r="3.4" />
      </svg>
    );
  }

  if (icon === "folder") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 7.5v-1A2.5 2.5 0 0 1 6 4h4l2 2.5h6A2.5 2.5 0 0 1 20.5 9v8.5A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h7l5 5v12H6z" />
      <path d="M13 3.5v5h5" />
    </svg>
  );
}

export function AvatarGooeyMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  function handleKeyDown(event) {
    if (event.key !== "Escape" || !isOpen) return;

    event.preventDefault();
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      className={`avatar-gooey-menu${isOpen ? " is-open" : ""}`}
      data-open={isOpen}
      onKeyDown={handleKeyDown}
    >
      <svg className="avatar-gooey-menu__liquid" viewBox="-160 -160 320 320" aria-hidden="true">
        <defs>
          <filter
            id="avatar-goo-filter"
            x="-190"
            y="-190"
            width="380"
            height="380"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" result="shape" />
            <feGaussianBlur in="shape" stdDeviation="10" result="shadow-blur" />
            <feOffset in="shadow-blur" dy="7" result="shadow-offset" />
            <feFlood floodColor="#071c13" floodOpacity="0.16" result="shadow-color" />
            <feComposite in="shadow-color" in2="shadow-offset" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="shape" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#avatar-goo-filter)">
          {actions.map((action, index) => (
            <circle
              className="avatar-gooey-menu__liquid-action"
              cx="0"
              cy="0"
              r="24"
              key={action.name}
              style={{
                "--action-index": index,
                "--action-x": action.x,
                "--action-y": action.y,
              }}
            />
          ))}
          <circle className="avatar-gooey-menu__liquid-center" cx="0" cy="0" r="47" />
        </g>
      </svg>

      <div className="avatar-gooey-menu__actions" id="avatar-quick-actions" aria-hidden={!isOpen}>
        {actions.map((action, index) => (
          <button
            className="avatar-gooey-menu__action"
            type="button"
            aria-label={action.name}
            tabIndex={isOpen ? 0 : -1}
            key={action.name}
            onClick={() => {
              if (action.icon === "camera") {
                setIsOpen(false);
                window.dispatchEvent(new Event("open-camera"));
              }
            }}
            style={{
              "--action-index": index,
              "--action-x": action.x,
              "--action-y": action.y,
            }}
          >
            <ActionIcon icon={action.icon} />
            <span className="avatar-gooey-menu__label">{action.name}</span>
          </button>
        ))}
      </div>

      <button
        className="avatar-gooey-menu__trigger"
        type="button"
        ref={triggerRef}
        aria-controls="avatar-quick-actions"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <BotAvatar
          className="avatar-gooey-menu__avatar"
          type="circle"
          size={36}
          color="#123f2d"
          state={isOpen ? "working" : "default"}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
