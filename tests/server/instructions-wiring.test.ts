import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { platformDef } from "../../src/shared/platforms";
import { postInstructions } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("postInstructions wiring", () => {
  it("names the writing-in-style skill, post tools and each platform catalog limit", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author" });

    for (const platform of ["telegram", "dzen", "vk", "x"] as const) {
      const post = store.createPost({ profileId: profile.id, platform, title: "Draft" });
      const instructions = postInstructions(post, profile);
      expect(instructions).toContain("writing-in-style");
      expect(instructions).toContain("mp_profile_get");
      expect(instructions).toContain("mp_post_write");
      expect(instructions).toContain("mp_propose_edit");
      const { limit } = platformDef(platform);
      if (limit !== null) expect(instructions).toContain(String(limit));
    }
  });

  it("omits injected style rules for every platform", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author" });
    const forbidden = ["formatting_per_text", "at most once", "call to readers", "roughness", "style.py check"];

    for (const platform of ["telegram", "dzen", "vk", "x"] as const) {
      const post = store.createPost({ profileId: profile.id, platform, title: "Draft" });
      const instructions = postInstructions(post, profile);
      for (const phrase of forbidden) expect(instructions).not.toContain(phrase);
    }
  });
});
