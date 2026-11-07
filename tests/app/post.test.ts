import { afterEach, describe, expect, it } from "vitest";
import { post } from "../../src/app/i18n/post";
import {
  chatBadge,
  clampChatWidth,
  DEFAULT_CHAT,
  selectionPrompt,
  splitMode,
  toolbarPosition,
} from "../../src/app/post/layout";
import type { Post, Proposal } from "../../src/shared/model";

const emptyPost = (tweets: Post["tweets"]): Pick<Post, "tweets"> => ({ tweets });

describe("clampChatWidth", () => {
  it("keeps the default 400 inside a wide pane", () => {
    expect(clampChatWidth(1600, DEFAULT_CHAT)).toBe(400);
  });

  it("clamps the chat to 320–640 and keeps the post at 480px or more", () => {
    expect(clampChatWidth(1600, 200)).toBe(320);
    expect(clampChatWidth(1600, 800)).toBe(640);
    expect(clampChatWidth(901, 640)).toBe(412);
    expect(clampChatWidth(809, 400)).toBe(320);
  });
});

describe("splitMode", () => {
  it("returns tabs at 900px and below", () => {
    expect(splitMode(900)).toBe("tabs");
    expect(splitMode(420)).toBe("tabs");
    expect(splitMode(901)).toBe("split");
    expect(splitMode(1280)).toBe("split");
  });
});

describe("toolbarPosition", () => {
  const card = { left: 100, top: 50, right: 500, bottom: 400, width: 400, height: 350 };
  const toolbar = { width: 280, height: 36 };

  it("sits above the selection and stays inside the card", () => {
    const selection = { left: 180, top: 160, right: 260, bottom: 180, width: 80, height: 20 };
    expect(toolbarPosition(selection, card, toolbar)).toEqual({ left: 100, top: 116 });
  });

  it("flips below the selection when there is no room above", () => {
    const selection = { left: 180, top: 60, right: 260, bottom: 80, width: 80, height: 20 };
    expect(toolbarPosition(selection, card, toolbar)).toEqual({ left: 100, top: 88 });
  });

  it("clamps to the card edges", () => {
    const selection = { left: 90, top: 200, right: 110, bottom: 220, width: 20, height: 20 };
    const pos = toolbarPosition(selection, card, toolbar);
    expect(pos.left).toBe(100);
    expect(pos.top).toBe(156);
  });
});

describe("chatBadge", () => {
  it("counts pending proposals plus stale RU tweets", () => {
    const proposals: Pick<Proposal, "status">[] = [
      { status: "pending" },
      { status: "pending" },
      { status: "applied" },
      { status: "rejected" },
    ];
    expect(
      chatBadge(
        emptyPost([
          { en: "a", ru: "а", ruStale: true },
          { en: "b", ru: "б", ruStale: false },
          { en: "c", ru: "в", ruStale: true },
        ]),
        proposals,
      ),
    ).toBe(4);
    expect(chatBadge(emptyPost([]), [])).toBe(0);
  });
});

describe("selectionPrompt", () => {
  afterEach(() => {
    if (typeof document !== "undefined") document.documentElement.lang = "en";
  });

  it("builds the chat request from i18n for each action", () => {
    expect(selectionPrompt("shorter", "Hello there")).toBe("Make this shorter, keep the voice: «Hello there»");
    expect(selectionPrompt("sharper", "Hello there")).toBe("Make this sharper, keep the voice: «Hello there»");
    expect(selectionPrompt("voice", "Hello there")).toBe("Rewrite this in the profile voice: «Hello there»");
    expect(selectionPrompt("shorter", "Hello there", "telegram")).toBe(
      "Make this shorter, keep the voice: «Hello there»",
    );
  });
});

describe("copywriterTitle", () => {
  it("uses Copywriter in EN and Копирайтер in RU", () => {
    expect(post.en.copywriterTitle).toBe("Copywriter");
    expect(post.ru.copywriterTitle).toBe("Копирайтер");
  });
});
