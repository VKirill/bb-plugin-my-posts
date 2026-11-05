import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { rulesLines } from "../../src/app/profile/model";
import { postInstructions } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("postInstructions voice fidelity", () => {
  it("includes formatting, endings, signature words, roughness, and pre-write check", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft" });
    const text = postInstructions(post, profile);
    expect(text).toMatch(/formatting_per_text/u);
    expect(text).toMatch(/at most once/u);
    expect(text).toMatch(/call to readers/u);
    expect(text).toMatch(/roughness/u);
    expect(text).toMatch(/style\.py check/u);
    expect(text).toMatch(/mp_propose_edit/u);
    expect(text).toMatch(/::mp-edit/u);
  });

  it("keeps the X bilingual line without changing the frozen X instruction layout", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author" });
    const post = store.createPost({ profileId: profile.id, platform: "x", title: "Draft" });
    const text = postInstructions(post, profile);
    expect(text).toMatch(/\{en, ru\}/u);
    expect(text).not.toMatch(/formatting_per_text/u);
  });
});

describe("rulesLines", () => {
  it("skips sub-headings inside the rules section", () => {
    const styleMd = "## Правила генерации\n### do\n- А\n- Б\n### avoid\n- В\n## Другое";
    expect(rulesLines(styleMd)).toEqual(["А", "Б", "В"]);
  });
});
