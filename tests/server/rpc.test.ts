import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerRpc, type SessionStarter } from "../../src/server/rpc";
import { MIGRATIONS, Store } from "../../src/server/store";
import { MP_CHANGED } from "../../src/shared/contract";
import type { Post, Profile } from "../../src/shared/model";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

function titleFrom(brief: string): string {
  return brief.slice(0, 60);
}

describe("registerRpc", () => {
  let store: Store;
  let publish: ReturnType<typeof vi.fn<(channel: string, payload: { profileId?: string; postId?: string }) => void>>;
  let send: ReturnType<typeof vi.fn>;
  let sessions: SessionStarter;
  let rpc: (method: string, input: unknown) => Promise<unknown>;

  beforeEach(() => {
    store = makeStore();
    publish = vi.fn();
    send = vi.fn(async () => ({ delivery: "sent" }));
    let profileN = 0;
    let postN = 0;
    sessions = {
      startProfileSession: async (profile: Profile) => {
        expect(profile.status).toBe("building");
        return `thr_style_${++profileN}`;
      },
      startPostSession: async (post: Post, _brief: string | null) => {
        expect(post.status).toBe("writing");
        return `thr_post_${++postN}`;
      },
    };
    const handlers: Record<string, (input: unknown) => unknown> = {};
    const bb = {
      rpc: {
        register: (_contract: unknown, map: Record<string, (input: unknown) => unknown>) => {
          Object.assign(handlers, map);
        },
      },
      sdk: { threads: { send } },
    };
    registerRpc(bb as never, store, sessions, (payload) => publish(MP_CHANGED, payload));
    rpc = async (method, input) => handlers[method]!(input);
  });

  async function expectWrite(method: string, input: unknown) {
    publish.mockClear();
    const result = await rpc(method, input);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0]![0]).toBe("my-posts:changed");
    return result;
  }

  it("creates a building profile and stores the style session thread", async () => {
    const profile = (await expectWrite("profile_create", { name: "Author One", source: "corpus.md" })) as Profile;
    expect(profile.status).toBe("building");
    expect(profile.styleThreadId).toBe("thr_style_1");
    expect(publish.mock.calls[0]![1]).toEqual({ profileId: profile.id });
  });

  it("creates a writing post, titles it from the brief, and stores the post session thread", async () => {
    const profile = (await rpc("profile_create", { name: "Author One" })) as Profile;
    const brief = "A long brief used as the working title for this draft item";
    const post = (await expectWrite("post_create", {
      profileId: profile.id,
      platform: "x",
      brief,
    })) as Post;
    expect(post.status).toBe("writing");
    expect(post.title).toBe(titleFrom(brief));
    expect(post.threadId).toBe("thr_post_1");
    expect(post.tweets).toEqual([{ en: "", ru: "", ruStale: false }]);
    expect(publish.mock.calls[0]![1]).toEqual({ profileId: profile.id, postId: post.id });
  });

  it("uses Untitled when post_create has no brief", async () => {
    const profile = (await rpc("profile_create", { name: "Author One" })) as Profile;
    const post = (await rpc("post_create", { profileId: profile.id, platform: "telegram" })) as Post;
    expect(post.title).toBe("Untitled");
    expect(post.tweets).toEqual([]);
  });

  it("sets ruStale through post_update when EN changes without RU", async () => {
    const profile = (await rpc("profile_create", { name: "Author One" })) as Profile;
    const post = (await rpc("post_create", { profileId: profile.id, platform: "x" })) as Post;
    const stale = (await expectWrite("post_update", {
      id: post.id,
      tweets: [{ en: "Hello there", ru: "", ruStale: false }],
    })) as Post;
    expect(stale.tweets[0]).toEqual({ en: "Hello there", ru: "", ruStale: true });
    const fresh = (await expectWrite("post_update", {
      id: post.id,
      tweets: [{ en: "Hello there", ru: "Привет", ruStale: true }],
    })) as Post;
    expect(fresh.tweets[0]).toEqual({ en: "Hello there", ru: "Привет", ruStale: false });
  });

  it("applies a proposal and refuses a stale before-string without changing the post", async () => {
    const profile = (await rpc("profile_create", { name: "Author One" })) as Profile;
    const post = (await rpc("post_create", { profileId: profile.id, platform: "telegram" })) as Post;
    await rpc("post_update", { id: post.id, body: "alpha beta" });
    const proposal = store.addProposal({
      postId: post.id,
      target: { kind: "body" },
      before: "alpha",
      after: "gamma",
    });
    const applied = (await expectWrite("proposal_apply", { id: proposal.id })) as { post: Post };
    expect(applied.post.body).toBe("gamma beta");

    const stale = store.addProposal({
      postId: post.id,
      target: { kind: "body" },
      before: "alpha",
      after: "delta",
    });
    const before = store.getPost(post.id);
    await expect(rpc("proposal_apply", { id: stale.id })).rejects.toThrow(/no longer/u);
    expect(store.getPost(post.id)).toEqual(before);
    expect(store.getProposal(stale.id).status).toBe("pending");
  });

  it("returns default settings when nothing is saved", async () => {
    await expect(rpc("settings_get", null)).resolves.toEqual({
      providerId: "claude-code",
      model: "claude-opus-5-5",
      projectId: null,
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it("publishes a change after every RPC write", async () => {
    const profile = (await expectWrite("profile_create", { name: "Author One" })) as Profile;
    await expectWrite("profile_update", { id: profile.id, name: "Author Two" });
    const post = (await expectWrite("post_create", { profileId: profile.id, platform: "vk" })) as Post;
    await expectWrite("post_update", { id: post.id, body: "wall text" });
    const proposal = store.addProposal({
      postId: post.id,
      target: { kind: "body" },
      before: "wall",
      after: "post",
    });
    await expectWrite("proposal_apply", { id: proposal.id });
    const extra = store.addProposal({
      postId: post.id,
      target: { kind: "body" },
      before: "post",
      after: "note",
    });
    await expectWrite("proposal_reject", { id: extra.id });
    expect(post.threadId).toBe("thr_post_1");
    await expectWrite("chat_send", { threadId: post.threadId, text: "please shorten" });
    expect(send).toHaveBeenCalledWith({
      threadId: "thr_post_1",
      input: [{ type: "text", text: "please shorten", mentions: [] }],
      mode: "auto",
    });
    await expectWrite("settings_set", { model: "claude-opus-5-5" });
    await expectWrite("profile_delete", { id: profile.id });
  });
});
