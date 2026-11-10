import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AvatarGooeyMenu } from "../src/avatar-menu.jsx";

vi.mock("bot-avatars", () => ({
  BotAvatar: (props) => <canvas data-avatar-color={props.color} aria-hidden={props["aria-hidden"]} />,
}));

const actionNames = ["Camera", "Add image", "New folder"];

afterEach(cleanup);

describe("AvatarGooeyMenu", () => {
  test("opens and closes the three quick actions from the avatar trigger", async () => {
    const user = userEvent.setup();
    render(<AvatarGooeyMenu />);

    const openTrigger = screen.getByRole("button", { name: "Open quick actions" });
    expect(openTrigger.getAttribute("aria-expanded")).toBe("false");

    for (const name of actionNames) {
      const action = screen.getByRole("button", { name, hidden: true });
      expect(action.tabIndex).toBe(-1);
    }

    await user.click(openTrigger);

    const closeTrigger = screen.getByRole("button", { name: "Close quick actions" });
    expect(closeTrigger.getAttribute("aria-expanded")).toBe("true");

    for (const name of actionNames) {
      expect(screen.getByRole("button", { name }).tabIndex).toBe(0);
    }

    await user.click(closeTrigger);

    expect(screen.getByRole("button", { name: "Open quick actions" }).getAttribute("aria-expanded")).toBe("false");
  });

  test("Escape closes the menu and restores focus to the avatar trigger", async () => {
    const user = userEvent.setup();
    render(<AvatarGooeyMenu />);

    await user.click(screen.getByRole("button", { name: "Open quick actions" }));
    const firstAction = screen.getByRole("button", { name: "Camera" });
    firstAction.focus();

    await user.keyboard("{Escape}");

    const trigger = screen.getByRole("button", { name: "Open quick actions" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  test("rapid repeated clicks keep the latest toggle state", async () => {
    const user = userEvent.setup();
    render(<AvatarGooeyMenu />);

    const trigger = screen.getByRole("button", { name: "Open quick actions" });
    await user.click(trigger);
    await user.click(trigger);
    await user.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
