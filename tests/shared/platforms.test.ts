import { describe, expect, it } from "vitest";
import { countChars, PLATFORMS, platformRules, readingMinutes } from "../../src/shared/platforms";

describe("platforms", () => {
  it("lists telegram, x, dzen and vk with their limits and default kinds", () => {
    expect(PLATFORMS).toEqual([
      { id: "telegram", limit: 4096, defaultKind: "post" },
      { id: "x", limit: 280, perTweet: true, maxTweets: 25, defaultKind: "thread" },
      { id: "dzen", limit: null, defaultKind: "article" },
      { id: "vk", limit: 16384, defaultKind: "post" },
    ]);
  });

  it("counts x URLs as 23 and other code points as 1", () => {
    expect(countChars("x", "hi https://example.com/a ok")).toBe(29);
    expect(countChars("x", "http://ex.test")).toBe(23);
    expect(countChars("x", "аб")).toBe(2);
    expect(countChars("x", "a https://a.test b http://b.test c")).toBe(7 + 23 + 23);
  });

  it("counts telegram (and other non-x) code points", () => {
    expect(countChars("telegram", "hi https://example.com/a ok")).toBe(27);
    expect(countChars("telegram", "аб")).toBe(2);
    expect(countChars("dzen", "ё")).toBe(1);
    expect(countChars("vk", "")).toBe(0);
  });

  it("states X bilingual tweet and thread rules", () => {
    const rules = platformRules("x");
    expect(rules).toMatch(/English and Russian/u);
    expect(rules).toMatch(/EN first/u);
    expect(rules).toMatch(/profile voice/u);
    expect(rules).toMatch(/280/u);
    expect(rules).toMatch(/25/u);
  });

  it("ceil-divides words by 180 for Dzen reading time", () => {
    expect(readingMinutes("")).toBe(0);
    expect(readingMinutes(Array.from({ length: 180 }, () => "w").join(" "))).toBe(1);
    expect(readingMinutes(Array.from({ length: 181 }, () => "w").join(" "))).toBe(2);
  });
});
