import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_KINDS, type SessionKind } from "../../src/server/kinds";
import { registerRpc } from "../../src/server/rpc";
import { mpSessionPolicy } from "../../src/server/session-policy";
import { agentConfiguration, type SessionStarter } from "../../src/server/sessions";
import { MIGRATIONS, Store, StoreError } from "../../src/server/store";
import { registerTools } from "../../src/server/tools";
import { MP_CHANGED } from "../../src/shared/contract";
import type { Post, Profile } from "../../src/shared/model";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

function skillNamesFromDisk(): Set<string> {
  const skillsRoot = join(dirname(fileURLToPath(import.meta.url)), "../../skills");
  const names = new Set<string>();
  for (const dir of readdirSync(skillsRoot)) {
    const text = readFileSync(join(skillsRoot, dir, "SKILL.md"), "utf8");
    for (const line of text.split("\n")) {
      const match = /^name:\s*(.+)$/u.exec(line);
      if (match !== null) names.add(match[1]!.trim().replaceAll('"', ""));
    }
  }
  return names;
}

const KINDS: SessionKind[] = ["profile", "post"];

describe("SESSION_KINDS", () => {
  it("keeps policy skills, configure skills and the kind table as the same set, matching SKILL.md names", () => {
    const store = makeStore();
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft" });
    const disk = skillNamesFromDisk();
    const meta: Record<SessionKind, { pluginMetadata: unknown }> = {
      profile: { pluginMetadata: { kind: "profile", profileId: profile.id } },
      post: { pluginMetadata: { kind: "post", postId: post.id } },
    };
    for (const kind of KINDS) {
      const fromTable = [...SESSION_KINDS[kind].skills].sort();
      const fromPolicy = [...(mpSessionPolicy(kind).skills?.names ?? [])].sort();
      const fromConfigure = [...(agentConfiguration(store, meta[kind]).skills ?? [])].sort();
      expect(fromPolicy).toEqual(fromTable);
      expect(fromConfigure).toEqual(fromTable);
      for (const name of fromTable) expect(disk.has(name)).toBe(true);
    }
  });

  it("returns only tool names that registerTools registered on a fake bb", () => {
    const store = makeStore();
    const registered: string[] = [];
    registerTools(
      {
        agents: {
          registerTool: (tool: { name: string }) => {
            registered.push(tool.name);
          },
        },
      } as never,
      store,
      () => {},
    );
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "vk", title: "Wall" });
    const profileTools = agentConfiguration(store, {
      pluginMetadata: { kind: "profile", profileId: profile.id },
    }).tools;
    const postTools = agentConfiguration(store, { pluginMetadata: { kind: "post", postId: post.id } }).tools;
    for (const name of profileTools) expect(registered).toContain(name);
    for (const name of postTools) expect(registered).toContain(name);
  });
});

describe("delete archives hidden threads", () => {
  let store: Store;
  let archive: ReturnType<typeof vi.fn>;
  let rpc: (method: string, input: unknown) => Promise<unknown>;

  beforeEach(() => {
    store = makeStore();
    archive = vi.fn(async () => undefined);
    const sessions: SessionStarter = {
      startProfileSession: async () => "thr_style_1",
      startPostSession: async () => "thr_post_1",
    };
    const handlers: Record<string, (input: unknown) => unknown> = {};
    const bb = {
      rpc: {
        register: (_contract: unknown, map: Record<string, (input: unknown) => unknown>) => {
          Object.assign(handlers, map);
        },
      },
      sdk: { threads: { send: vi.fn(), archive } },
      log: { warn: vi.fn() },
    };
    registerRpc(bb as never, store, sessions, () => {});
    rpc = async (method, input) => handlers[method]!(input);
  });

  it("post_delete removes the post and its proposals and archives the post thread", async () => {
    const profile = (await rpc("profile_create", { name: "Author One" })) as Profile;
    const post = (await rpc("post_create", { profileId: profile.id, platform: "telegram" })) as Post;
    const proposal = store.addProposal({
      postId: post.id,
      target: { kind: "body" },
      before: "a",
      after: "b",
    });
    archive.mockClear();
    await expect(rpc("post_delete", { id: post.id })).resolves.toEqual({ id: post.id });
    expect(() => store.getPost(post.id)).toThrow(StoreError);
    expect(() => store.getProposal(proposal.id)).toThrow(StoreError);
    expect(archive).toHaveBeenCalledWith({ threadId: "thr_post_1" });
  });

  it("profile_delete archives the style thread and every post thread", async () => {
    let postN = 0;
    const handlers: Record<string, (input: unknown) => unknown> = {};
    const sessions: SessionStarter = {
      startProfileSession: async () => "thr_style_1",
      startPostSession: async () => `thr_post_${++postN}`,
    };
    archive = vi.fn(async () => undefined);
    const bb = {
      rpc: {
        register: (_contract: unknown, map: Record<string, (input: unknown) => unknown>) => {
          Object.assign(handlers, map);
        },
      },
      sdk: { threads: { send: vi.fn(), archive } },
      log: { warn: vi.fn() },
    };
    store = makeStore();
    registerRpc(bb as never, store, sessions, () => {});
    rpc = async (method, input) => handlers[method]!(input);
    const profile = (await rpc("profile_create", { name: "Author One" })) as Profile;
    await rpc("post_create", { profileId: profile.id, platform: "telegram" });
    await rpc("post_create", { profileId: profile.id, platform: "vk" });
    const posts = store.listPosts(profile.id);
    archive.mockClear();
    await rpc("profile_delete", { id: profile.id });
    expect(archive.mock.calls.map((call) => call[0])).toEqual([
      { threadId: "thr_style_1" },
      ...posts.map((post) => ({ threadId: post.threadId })),
    ]);
  });
});

describe("settings language", () => {
  it("reads auto on an empty store and stores ru from settings_set", async () => {
    const store = makeStore();
    const handlers: Record<string, (input: unknown) => unknown> = {};
    const sessions: SessionStarter = {
      startProfileSession: async () => "",
      startPostSession: async () => "",
    };
    registerRpc(
      {
        rpc: {
          register: (_contract: unknown, map: Record<string, (input: unknown) => unknown>) => {
            Object.assign(handlers, map);
          },
        },
        sdk: { threads: { send: vi.fn() } },
        log: { warn: vi.fn() },
      } as never,
      store,
      sessions,
      () => {},
    );
    const rpc = async (method: string, input: unknown) => handlers[method]!(input);
    await expect(rpc("settings_get", null)).resolves.toEqual({
      providerId: "claude-code",
      model: "claude-opus-5-5",
      projectId: null,
      language: "auto",
    });
    await expect(rpc("settings_set", { language: "ru" })).resolves.toEqual({
      providerId: "claude-code",
      model: "claude-opus-5-5",
      projectId: null,
      language: "ru",
    });
  });
});

describe("MP_CHANGED", () => {
  it("lives on the contract", () => {
    expect(MP_CHANGED).toEqual("my-posts:changed");
  });
});
