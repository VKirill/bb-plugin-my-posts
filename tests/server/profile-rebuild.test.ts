import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileKickoff, profileRebuildKickoff } from "../../src/server/kinds";
import { registerRpc, type SessionStarter } from "../../src/server/rpc";
import { MIGRATIONS, Store } from "../../src/server/store";
import type { Post, Profile } from "../../src/shared/model";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("profile_rebuild", () => {
  let store: Store;
  let send: ReturnType<typeof vi.fn>;
  let archive: ReturnType<typeof vi.fn>;
  let startProfileSession: ReturnType<
    typeof vi.fn<SessionStarter["startProfileSession"]>
  >;
  let rpc: (method: string, input: unknown) => Promise<unknown>;

  beforeEach(() => {
    store = makeStore();
    send = vi.fn();
    archive = vi.fn();
    startProfileSession = vi.fn(async () => "thr_new");
    const sessions: SessionStarter = {
      startProfileSession,
      startPostSession: async (_post: Post, _brief: string | null) => "thr_post",
    };
    const handlers: Record<string, (input: unknown) => unknown> = {};
    const bb = {
      rpc: {
        register: (_contract: unknown, map: Record<string, (input: unknown) => unknown>) => {
          Object.assign(handlers, map);
        },
      },
      sdk: { threads: { send, archive } },
      log: { warn: vi.fn() },
    };
    registerRpc(bb as never, store, sessions, () => {});
    rpc = async (method, input) => handlers[method]!(input);
  });

  function readyProfile(): Profile {
    const created = store.createProfile({ name: "Author", source: "https://t.me/x" });
    return store.updateProfile(created.id, { styleThreadId: "thr_old", status: "ready" });
  }

  it("starts a rebuild session, archives the old thread, and never chat_sends", async () => {
    const old = readyProfile();
    const profile = (await rpc("profile_rebuild", { id: old.id })) as Profile;
    expect(startProfileSession).toHaveBeenCalledTimes(1);
    expect(startProfileSession).toHaveBeenCalledWith(old, "en", "rebuild");
    expect(archive).toHaveBeenCalledTimes(1);
    expect(archive).toHaveBeenCalledWith({ threadId: "thr_old" });
    expect(send).not.toHaveBeenCalled();
    expect(profile.styleThreadId).toBe("thr_new");
    expect(profile.status).toBe("building");
  });

  it("leaves the old thread in place when startProfileSession throws", async () => {
    const old = readyProfile();
    const spawnError = new Error("spawn failed");
    startProfileSession.mockRejectedValueOnce(spawnError);
    await expect(rpc("profile_rebuild", { id: old.id })).rejects.toBe(spawnError);
    expect(store.getProfile(old.id).styleThreadId).toBe("thr_old");
    expect(archive).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("profileRebuildKickoff", () => {
  it("names the profile and rebuilds from the source via mp_profile_get, unlike create", () => {
    const db = new Database(":memory:");
    for (const sql of MIGRATIONS) db.exec(sql);
    const store = new Store(db);
    const profile = store.createProfile({ name: "Author", source: "https://t.me/x" });
    const rebuild = profileRebuildKickoff(profile, "ru");
    const create = profileKickoff(profile, "ru");
    expect(rebuild).toContain("Author");
    expect(rebuild).toContain("mp_profile_get");
    expect(rebuild).toContain("https://t.me/x");
    expect(rebuild).not.toBe(create);
  });
});
