import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerRpc, type SessionStarter } from "../../src/server/rpc";
import { MIGRATIONS, Store, StoreError } from "../../src/server/store";
import { MP_CHANGED } from "../../src/shared/contract";
import type { Post, Profile } from "../../src/shared/model";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("create rollback on session start failure", () => {
  let store: Store;
  let publish: ReturnType<typeof vi.fn<(channel: string, payload: { profileId?: string; postId?: string }) => void>>;
  let sessions: SessionStarter;
  let rpc: (method: string, input: unknown) => Promise<unknown>;
  let logWarn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = makeStore();
    publish = vi.fn();
    logWarn = vi.fn();
    sessions = {
      startProfileSession: async (profile: Profile) => {
        expect(profile.status).toBe("building");
        return "thr_style_ok";
      },
      startPostSession: async (post: Post, _brief: string | null) => {
        expect(post.status).toBe("writing");
        return "thr_post_ok";
      },
    };
    const handlers: Record<string, (input: unknown) => unknown> = {};
    const bb = {
      rpc: {
        register: (_contract: unknown, map: Record<string, (input: unknown) => unknown>) => {
          Object.assign(handlers, map);
        },
      },
      sdk: { threads: { send: vi.fn() } },
      log: { warn: logWarn },
    };
    registerRpc(bb as never, store, sessions, (payload) => publish(MP_CHANGED, payload));
    rpc = async (method, input) => handlers[method]!(input);
  });

  it("rolls back the profile and rethrows when startProfileSession rejects", async () => {
    const spawnError = new Error("spawn failed");
    sessions.startProfileSession = async () => {
      throw spawnError;
    };
    await expect(rpc("profile_create", { name: "Author One", source: "corpus.md" })).rejects.toBe(spawnError);
    expect(store.listProfiles()).toEqual([]);
    expect(publish).not.toHaveBeenCalled();
  });

  it("rolls back the post and rethrows when startPostSession rejects", async () => {
    const profile = (await rpc("profile_create", { name: "Author One" })) as Profile;
    publish.mockClear();
    const spawnError = new Error("spawn failed");
    sessions.startPostSession = async () => {
      throw spawnError;
    };
    await expect(
      rpc("post_create", { profileId: profile.id, platform: "telegram", brief: "Draft brief" }),
    ).rejects.toBe(spawnError);
    expect(store.listPosts(profile.id)).toEqual([]);
    expect(publish).not.toHaveBeenCalled();
  });

  it("keeps the spawn error when rollback delete throws", async () => {
    const spawnError = new Error("spawn failed");
    sessions.startProfileSession = async () => {
      throw spawnError;
    };
    vi.spyOn(store, "deleteProfile").mockImplementation(() => {
      throw new Error("cleanup failed");
    });
    await expect(rpc("profile_create", { name: "Author One" })).rejects.toBe(spawnError);
    expect(logWarn).toHaveBeenCalledWith("MyPosts rollback failed: Error: cleanup failed");
  });

  it("deletePost removes exactly one post and its proposals", () => {
    const profile = store.createProfile({ name: "Author One" });
    const keep = store.createPost({ profileId: profile.id, platform: "telegram", title: "Keep" });
    const gone = store.createPost({ profileId: profile.id, platform: "telegram", title: "Gone" });
    const proposal = store.addProposal({
      postId: gone.id,
      target: { kind: "body" },
      before: "a",
      after: "b",
    });
    store.addProposal({
      postId: keep.id,
      target: { kind: "body" },
      before: "c",
      after: "d",
    });
    store.deletePost(gone.id);
    expect(store.listPosts(profile.id).map((row) => row.id)).toEqual([keep.id]);
    expect(() => store.getPost(gone.id)).toThrow(StoreError);
    expect(() => store.getProposal(proposal.id)).toThrow(StoreError);
    expect(store.listProposals(keep.id)).toHaveLength(1);
  });
});
