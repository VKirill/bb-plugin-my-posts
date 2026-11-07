import { describe, expect, it } from "vitest";
import { platformCopy } from "../../src/app/i18n/platforms";
import { PLATFORMS_IDS, type Platform } from "../../src/shared/model";
import { PLATFORMS, PLATFORM_LIST, platformRules } from "../../src/shared/platforms";

const FORBIDDEN = /bold|italic|attachment|poll|жирн|курсив|вложени|опрос/iu;

describe("platform catalog", () => {
  it("has one def per PLATFORMS_IDS id and PLATFORM_LIST follows that order", () => {
    expect(Object.keys(PLATFORMS).sort()).toEqual([...PLATFORMS_IDS].sort());
    expect(PLATFORM_LIST.map((row) => row.id)).toEqual([...PLATFORMS_IDS]);
    for (const id of PLATFORMS_IDS) {
      expect(PLATFORMS[id].id).toBe(id);
    }
  });

  it("uses post/thread/article/post defaults and keeps article off X", () => {
    expect(PLATFORMS.telegram.kinds[0]).toBe("post");
    expect(PLATFORMS.x.kinds[0]).toBe("thread");
    expect(PLATFORMS.dzen.kinds[0]).toBe("article");
    expect(PLATFORMS.vk.kinds[0]).toBe("post");
    expect(PLATFORMS.x.kinds.includes("article")).toBe(false);
  });

  it("puts each limit into platformRules and 25 into the X thread cap", () => {
    for (const id of PLATFORMS_IDS) {
      const { limit } = PLATFORMS[id];
      if (limit === null) continue;
      expect(platformRules(id)).toContain(String(limit));
    }
    expect(platformRules("x")).toContain("25");
  });

  it("keeps i18n hint and rules as limit facts without markup or attachments", () => {
    const locales = ["en", "ru"] as const;
    for (const locale of locales) {
      for (const id of PLATFORMS_IDS) {
        const copy = platformCopy[locale][id as Platform];
        const { limit } = PLATFORMS[id];
        if (limit !== null) {
          expect(copy.hint).toContain(String(limit));
          expect(copy.rules).toContain(String(limit));
        }
        expect(copy.hint).not.toMatch(FORBIDDEN);
        expect(copy.rules).not.toMatch(FORBIDDEN);
      }
    }
  });
});
