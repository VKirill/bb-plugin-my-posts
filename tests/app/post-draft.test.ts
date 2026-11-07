import { describe, expect, it } from "vitest";
import { mergeServerDraft, type Draft } from "../../src/app/post/draft";

const local: Draft = {
  title: "local title",
  body: "local body",
  tweets: [{ en: "local", ru: "лок", ruStale: false }],
};

const server: Draft = {
  title: "server title",
  body: "server body",
  tweets: [{ en: "server", ru: "серв", ruStale: true }],
};

describe("mergeServerDraft", () => {
  it("keeps every dirty local field and takes the server for the rest", () => {
    expect(mergeServerDraft(local, server, new Set(["title"]))).toEqual({
      title: local.title,
      body: server.body,
      tweets: server.tweets,
    });
    expect(mergeServerDraft(local, server, new Set(["body", "tweets"]))).toEqual({
      title: server.title,
      body: local.body,
      tweets: local.tweets,
    });
    expect(mergeServerDraft(local, server, new Set(["title", "body", "tweets"]))).toEqual(local);
  });

  it("returns the server draft when nothing is dirty", () => {
    expect(mergeServerDraft(local, server, new Set())).toEqual(server);
  });
});
