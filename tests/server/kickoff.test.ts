import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  postInstructions,
  postKickoff,
  profileInstructions,
  profileKickoff,
} from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("profileKickoff", () => {
  it("reads naturally in Russian without tool or skill names", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Тест голоса", source: "https://t.me/channel" });
    const text = profileKickoff(profile, "ru");
    expect(text).toBe(
      "Собери портрет стиля профиля «Тест голоса». Источник: https://t.me/channel",
    );
    expect(text).not.toMatch(/mp_/u);
    expect(text).not.toMatch(/style-portrait/u);
  });

  it("asks for source in Russian when empty", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Автор" });
    const text = profileKickoff(profile, "ru");
    expect(text).toBe(
      "Собери портрет стиля профиля «Автор». Источник: попроси у меня ссылку на канал или тексты",
    );
    expect(text).not.toMatch(/mp_/u);
  });
});

describe("postKickoff", () => {
  it("matches the Russian Telegram acceptance string", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Тест голоса" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft" });
    const text = postKickoff(post, profile, "Почему короткие посты читают чаще", "ru");
    expect(text).toBe(
      "Напиши пост для Telegram в голосе профиля «Тест голоса». Бриф: Почему короткие посты читают чаще",
    );
    expect(text).not.toMatch(/mp_/u);
    expect(text).not.toMatch(/writing-in-style/u);
  });

  it("matches the English Telegram acceptance string", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Тест голоса" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft" });
    const text = postKickoff(post, profile, "Почему короткие посты читают чаще", "en");
    expect(text).toBe(
      "Write a Telegram post in the voice of profile «Тест голоса». Brief: Почему короткие посты читают чаще",
    );
    expect(text).not.toMatch(/mp_/u);
  });
});

describe("agent instructions", () => {
  it("carries profile tool guidance moved out of the kickoff", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author" });
    const text = profileInstructions(profile);
    expect(text).toMatch(/style-portrait skill/u);
    expect(text).toMatch(/mp_fetch_telegram/u);
    expect(text).toMatch(/style\.py corpus/u);
    expect(text).toMatch(/mp_profile_save/u);
  });

  it("carries post tool guidance moved out of the kickoff", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft" });
    const text = postInstructions(post, profile);
    expect(text).toMatch(/writing-in-style skill/u);
    expect(text).toMatch(/mp_profile_get/u);
    expect(text).toMatch(/mp_post_write/u);
    expect(text).toMatch(/mp_propose_edit/u);
  });
});
