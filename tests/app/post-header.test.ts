import { describe, expect, it } from "vitest";
import { post } from "../../src/app/i18n/post";
import { postHeader } from "../../src/app/post/header";

describe("postHeader", () => {
  it("hides the word next to the X tile because the tile is the label", () => {
    expect(postHeader("x")).toEqual({ platform: "x", label: "X", showLabel: false });
  });

  it("keeps the Telegram word beside the tile", () => {
    expect(postHeader("telegram").label).toBe("Telegram");
    expect(postHeader("telegram").showLabel).toBe(true);
    expect(postHeader("telegram").platform).toBe("telegram");
  });
});

describe("copywriterTitle", () => {
  it("uses Copywriter in EN and Копирайтер in RU", () => {
    expect(post.en.copywriterTitle).toBe("Copywriter");
    expect(post.ru.copywriterTitle).toBe("Копирайтер");
  });
});
