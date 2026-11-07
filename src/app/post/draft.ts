import type { Tweet } from "../../shared/model";

export type DraftField = "title" | "body" | "tweets";

export type Draft = {
  title: string;
  body: string;
  tweets: Tweet[];
};

export function mergeServerDraft(local: Draft, server: Draft, dirty: ReadonlySet<DraftField>): Draft {
  return {
    title: dirty.has("title") ? local.title : server.title,
    body: dirty.has("body") ? local.body : server.body,
    tweets: dirty.has("tweets") ? local.tweets : server.tweets,
  };
}
