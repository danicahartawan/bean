import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AvatarGooeyMenu } from "./avatar-menu.jsx";

const mount = document.getElementById("bot-avatar-menu-root");

if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <AvatarGooeyMenu />
    </StrictMode>,
  );
}
