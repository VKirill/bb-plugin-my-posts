import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { platformRules } from "../../src/shared/platforms";
import { postInstructions } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("postInstructions wiring", () => {
  it("joins only role, post/profile, skill/tools, platform rules and edit protocol", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft" });

    expect(postInstructions(post, profile)).toBe(
      [
        "You are the copywriter of MyPosts.",
        `You work on post ${post.id} for profile ${profile.name} (${profile.id}).`,
        "Use the writing-in-style skill. Load the profile with mp_profile_get, write the draft with mp_post_write, and propose every later change with mp_propose_edit.",
        platformRules("telegram"),
        "After the first draft, never rewrite the post silently: every change is an mp_propose_edit, and you put its ::mp-edit{id=…} line on its own line in your reply.",
      ].join(" "),
    );
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
