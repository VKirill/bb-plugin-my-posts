import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchTelegramChannel, parseTelegramPage } from "../../src/server/telegram";

const fixture = readFileSync(new URL("../fixtures/telegram/channel.html", import.meta.url), "utf8");

describe("parseTelegramPage", () => {
  it("returns public message texts in order and skips forwards", () => {
    expect(parseTelegramPage(fixture)).toEqual([
      { id: "sample_channel/10", text: "First note about tools" },
      { id: "sample_channel/12", text: "Line one\nLine two & more" },
      { id: "sample_channel/13", text: "Fourth public post" },
    ]);
  });
});

describe("fetchTelegramChannel", () => {
  it("joins posts with --- and stops at the limit using an injected fetch", async () => {
    const urls: string[] = [];
    const result = await fetchTelegramChannel("https://t.me/s/sample_channel", 2, async (url) => {
      urls.push(url);
      return { ok: true, text: async () => fixture };
    });
    expect(urls).toEqual(["https://t.me/s/sample_channel"]);
    expect(result.posts.map((post) => post.text)).toEqual(["First note about tools", "Line one\nLine two & more"]);
    expect(result.text).toBe("First note about tools\n\n---\n\nLine one\nLine two & more");
    expect(result.skippedForwards).toBe(1);
  });

  it("pages backwards with before= until the limit", async () => {
    const older = `<div class="tgme_widget_message js-widget_message" data-post="sample_channel/8">
      <div class="tgme_widget_message_text">Older note</div>
    </div>`;
    const urls: string[] = [];
    const result = await fetchTelegramChannel("@sample_channel", 4, async (url) => {
      urls.push(url);
      if (url.includes("before=")) return { ok: true, text: async () => older };
      return { ok: true, text: async () => fixture };
    });
    expect(urls).toEqual(["https://t.me/s/sample_channel", "https://t.me/s/sample_channel?before=10"]);
    expect(result.posts.map((post) => post.text)).toEqual([
      "First note about tools",
      "Line one\nLine two & more",
      "Fourth public post",
      "Older note",
    ]);
  });
});
