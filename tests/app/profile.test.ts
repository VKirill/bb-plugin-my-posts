import { describe, expect, it } from "vitest";
import { canCreatePost, portraitLayers, railCounts, recentPosts } from "../../src/app/profile/model";
import type { Post, Profile } from "../../src/shared/model";

function makeProfile(over: Partial<Profile> = {}): Profile {
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
    ...over,
  };
}

function makePost(over: Partial<Post>): Post {
  return {
    id: "pst_1",
    profileId: "prf_1",
    platform: "telegram",
    kind: "post",
    title: "One",
    status: "draft",
    body: "",
    tweets: [],
    threadId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("portraitLayers", () => {
  it("marks layers running while the profile is building and nothing is filled", () => {
    expect(portraitLayers(makeProfile())).toEqual({ a: "running", b: "running", c: "running" });
  });

  it("marks unfinished layers waiting once the profile is no longer building", () => {
    expect(portraitLayers(makeProfile({ status: "ready" }))).toEqual({ a: "waiting", b: "waiting", c: "waiting" });
    expect(portraitLayers(makeProfile({ status: "lowdata" }))).toEqual({ a: "waiting", b: "waiting", c: "waiting" });
  });

  it("marks A ready when metrics exist, B from the voice heading, C from the rules heading", () => {
    const profile = makeProfile({
      status: "building",
      metrics: { sentenceLength: 11.4 },
      styleMd: "## Голос (слой B)\ntraits\n\n## Правила генерации (слой C)\ndo\n",
    });
    expect(portraitLayers(profile)).toEqual({ a: "ready", b: "ready", c: "ready" });
  });

  it("treats English Voice and Writing rules headings as ready layers", () => {
    const profile = makeProfile({
      status: "ready",
      metrics: { posts: 12 },
      styleMd: "## Voice\n## Writing rules\n",
    });
    expect(portraitLayers(profile)).toEqual({ a: "ready", b: "ready", c: "ready" });
  });

  it("keeps B and C running when only metrics are present during building", () => {
    expect(portraitLayers(makeProfile({ metrics: { n: 1 } }))).toEqual({ a: "ready", b: "running", c: "running" });
  });
});

describe("railCounts", () => {
  it("counts all posts and each platform", () => {
    const posts = [
      makePost({ id: "1", platform: "telegram" }),
      makePost({ id: "2", platform: "telegram" }),
      makePost({ id: "3", platform: "x" }),
      makePost({ id: "4", platform: "dzen" }),
      makePost({ id: "5", platform: "vk" }),
    ];
    expect(railCounts(posts)).toEqual({ all: 5, telegram: 2, x: 1, dzen: 1, vk: 1 });
  });

  it("returns zeros for an empty list", () => {
    expect(railCounts([])).toEqual({ all: 0, telegram: 0, x: 0, dzen: 0, vk: 0 });
  });
});

describe("recentPosts", () => {
  it("orders by updatedAt descending and keeps n items", () => {
    const posts = [
      makePost({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      makePost({ id: "new", updatedAt: "2026-03-01T00:00:00.000Z" }),
      makePost({ id: "mid", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(recentPosts(posts, 2).map((post) => post.id)).toEqual(["new", "mid"]);
  });
});

describe("canCreatePost", () => {
  it("allows a post or article on Telegram, Dzen and VK", () => {
    expect(canCreatePost("telegram", "post")).toBe(true);
    expect(canCreatePost("telegram", "article")).toBe(true);
    expect(canCreatePost("dzen", "article")).toBe(true);
    expect(canCreatePost("vk", "post")).toBe(true);
  });

  it("allows an X thread or post and rejects an X article", () => {
    expect(canCreatePost("x", "thread")).toBe(true);
    expect(canCreatePost("x", "post")).toBe(true);
    expect(canCreatePost("x", "article")).toBe(false);
  });
});
