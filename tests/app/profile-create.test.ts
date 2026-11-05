import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "../../src/app/i18n";
import { profile } from "../../src/app/i18n/profile";
import { afterCreateRoute } from "../../src/app/profile/model";
import { routePath } from "../../src/app/routes";
import type { Profile } from "../../src/shared/model";

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
    expect(profile.en.hintTelegram).toEqual("up to 4096 chars · bold, italic, links · first link preview");
    expect(profile.en.hintX).toEqual("280 per tweet · every tweet in EN and RU · thread up to 25");
    expect(profile.en.hintDzen).toEqual("article · title, cover, H2 headings");
    expect(profile.en.hintVk).toEqual("post with attachments · photo, poll");
    expect(profile.ru.hintTelegram).toEqual("до 4096 знаков · жирный, курсив, ссылки · превью первой ссылки");
    expect(profile.ru.hintX).toEqual("280 на твит · каждый твит на EN и RU · тред до 25");
    expect(profile.ru.hintDzen).toEqual("статья · заголовок, обложка, подзаголовки H2");
    expect(profile.ru.hintVk).toEqual("пост с вложениями · фото, опрос");
    expect(DICTIONARIES.en.hintTelegram).toEqual(profile.en.hintTelegram);
    expect(DICTIONARIES.en.hintX).toEqual(profile.en.hintX);
    expect(DICTIONARIES.en.hintDzen).toEqual(profile.en.hintDzen);
    expect(DICTIONARIES.en.hintVk).toEqual(profile.en.hintVk);
    expect(DICTIONARIES.ru.hintTelegram).toEqual(profile.ru.hintTelegram);
    expect(DICTIONARIES.ru.hintX).toEqual(profile.ru.hintX);
    expect(DICTIONARIES.ru.hintDzen).toEqual(profile.ru.hintDzen);
    expect(DICTIONARIES.ru.hintVk).toEqual(profile.ru.hintVk);
  });
});
