import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS, Store, StoreError } from "../../src/server/store";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("Store", () => {
  let store: Store;

  beforeEach(() => {
    store = makeStore();
  });

  it("creates profiles with building status and prefixed ids", () => {
    const profile = store.createProfile({ name: "Author One", source: "notes.txt" });
    expect(profile.id.startsWith("prf_")).toBe(true);
    expect(profile.status).toBe("building");
    expect(profile.source).toBe("notes.txt");
    expect(profile.styleThreadId).toBe(null);
    expect(store.listProfiles().map((row) => row.id)).toEqual([profile.id]);
  });

  it("cascades profile delete to posts and proposals", () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft A" });
    store.addProposal({ postId: post.id, target: { kind: "body" }, before: "a", after: "b" });
    store.deleteProfile(profile.id);
    expect(() => store.getProfile(profile.id)).toThrow(StoreError);
    expect(() => store.getPost(post.id)).toThrow(StoreError);
  });

  it("creates an empty tweet for x posts and filters list by platform", () => {
    const profile = store.createProfile({ name: "Author One" });
    const thread = store.createPost({ profileId: profile.id, platform: "x", title: "Thread A", status: "writing" });
    store.createPost({ profileId: profile.id, platform: "vk", title: "Wall A" });
    expect(thread.kind).toBe("thread");
    expect(thread.tweets).toEqual([{ en: "", ru: "", ruStale: false }]);
    expect(store.listPosts(profile.id, "x").map((row) => row.id)).toEqual([thread.id]);
  });

  it("marks ruStale when EN changes without RU, and clears it when RU changes", () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "x", title: "Thread A" });
    const withEn = store.updatePost(post.id, { tweets: [{ en: "Hello there", ru: "", ruStale: false }] });
    expect(withEn.tweets).toEqual([{ en: "Hello there", ru: "", ruStale: true }]);
    const withRu = store.updatePost(post.id, { tweets: [{ en: "Hello there", ru: "Привет", ruStale: true }] });
    expect(withRu.tweets).toEqual([{ en: "Hello there", ru: "Привет", ruStale: false }]);
  });

  it("replaces proposal before-text and leaves the post unchanged when it is gone", () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Note A", body: "alpha beta" });
    const proposal = store.addProposal({
      postId: post.id,
      target: { kind: "body" },
      before: "alpha",
      after: "gamma",
    });
    expect(proposal.id.startsWith("prp_")).toBe(true);
    const applied = store.applyProposal(proposal.id);
    expect(applied.post.body).toBe("gamma beta");
    expect(applied.proposal.status).toBe("applied");

    const stale = store.addProposal({
      postId: post.id,
      target: { kind: "body" },
      before: "alpha",
      after: "delta",
    });
    expect(() => store.applyProposal(stale.id)).toThrow(/no longer/u);
    expect(store.getPost(post.id).body).toBe("gamma beta");
    expect(store.getProposal(stale.id).status).toBe("pending");
  });

  it("applies a tweet-language proposal", () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "x", title: "Thread A" });
    store.updatePost(post.id, { tweets: [{ en: "Hello there", ru: "Привет", ruStale: false }] });
    const proposal = store.addProposal({
      postId: post.id,
      target: { kind: "tweet", index: 0, lang: "en" },
      before: "Hello there",
      after: "Hello world",
    });
    const applied = store.applyProposal(proposal.id);
    expect(applied.post.tweets[0]).toEqual({ en: "Hello world", ru: "Привет", ruStale: true });
  });

  it("returns default settings until values are saved", () => {
    expect(store.getSettings()).toEqual({
      providerId: "claude-code",
      model: "claude-opus-5-5",
      projectId: null,
    });
    expect(store.setSettings({ projectId: "proj_test" })).toEqual({
      providerId: "claude-code",
      model: "claude-opus-5-5",
      projectId: "proj_test",
    });
  });

  it("looks up posts and profiles by thread id", () => {
    const profile = store.createProfile({ name: "Author One" });
    store.updateProfile(profile.id, { styleThreadId: "thr_style" });
    const post = store.createPost({ profileId: profile.id, platform: "dzen", title: "Article A" });
    store.updatePost(post.id, { threadId: "thr_post" });
    expect(store.profileByThread("thr_style")?.id).toBe(profile.id);
    expect(store.postByThread("thr_post")?.id).toBe(post.id);
    expect(store.profileByThread("thr_missing")).toBe(null);
  });
});
