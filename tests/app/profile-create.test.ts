import { describe, expect, it } from "vitest";
import { platformCopy } from "../../src/app/i18n/platforms";
import { afterCreateRoute } from "../../src/app/profile/model";
import { routePath } from "../../src/app/routes";
import type { Profile } from "../../src/shared/model";
import { PLATFORMS } from "../../src/shared/platforms";

function makeProfile(): Profile {
  return {
    id: "prf_1",
    name: "Voice",
    source: "",
    status: "building",
    styleMd: "",
    metrics: {},
    traits: [],
    styleThreadId: "thr_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("afterCreateRoute", () => {
  it("opens the new profile on the Style chat tab", () => {
    const route = afterCreateRoute(makeProfile());
    expect(route).toEqual({ kind: "profile", profileId: "prf_1", tab: "voice" });
    expect(routePath(route)).toBe("p/prf_1/voice");
  });
});

describe("platform hints", () => {
  it("gives telegram, x, dzen and vk hints in both dictionaries, with 4096 on ru telegram", () => {
    expect(platformCopy.en.telegram.hint).toEqual(`up to ${PLATFORMS.telegram.limit} chars`);
    expect(platformCopy.en.x.hint).toEqual(
      `${PLATFORMS.x.limit} per tweet · every tweet in EN and RU · thread up to ${PLATFORMS.x.maxTweets}`,
    );
    expect(platformCopy.en.dzen.hint).toEqual("article · title, H2 headings");
    expect(platformCopy.en.vk.hint).toEqual(`up to ${PLATFORMS.vk.limit} chars`);
    expect(platformCopy.ru.telegram.hint).toEqual(`до ${PLATFORMS.telegram.limit} знаков`);
    expect(platformCopy.ru.x.hint).toEqual(
      `${PLATFORMS.x.limit} на твит · каждый твит на EN и RU · тред до ${PLATFORMS.x.maxTweets}`,
    );
    expect(platformCopy.ru.dzen.hint).toEqual("статья · заголовок, подзаголовки H2");
    expect(platformCopy.ru.vk.hint).toEqual(`до ${PLATFORMS.vk.limit} знаков`);
    expect(platformCopy.ru.telegram.hint).toContain("4096");
    expect(platformCopy.en.telegram.hint).toEqual(platformCopy.en.telegram.rules);
    expect(platformCopy.en.x.hint).toEqual(platformCopy.en.x.rules);
    expect(platformCopy.en.dzen.hint).toEqual(platformCopy.en.dzen.rules);
    expect(platformCopy.en.vk.hint).toEqual(platformCopy.en.vk.rules);
    expect(platformCopy.ru.telegram.hint).toEqual(platformCopy.ru.telegram.rules);
    expect(platformCopy.ru.x.hint).toEqual(platformCopy.ru.x.rules);
    expect(platformCopy.ru.dzen.hint).toEqual(platformCopy.ru.dzen.rules);
    expect(platformCopy.ru.vk.hint).toEqual(platformCopy.ru.vk.rules);
  });
});
