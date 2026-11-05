import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentConfiguration, createSessions, postInstructions } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";
import { POST_TOOLS, PROFILE_TOOLS } from "../../src/server/tools";
import { platformRules } from "../../src/shared/platforms";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("createSessions", () => {
  let store: Store;
  let spawn: ReturnType<typeof vi.fn>;
  let sessions: ReturnType<typeof createSessions>;

  beforeEach(() => {
    store = makeStore();
    spawn = vi.fn(async (args: { title: string }) => ({ id: `thr_${args.title}` }));
    const bb = {
      sdk: {
        threads: { spawn },
        projects: {
          list: async () => [{ id: "proj_personal", kind: "personal" as const, name: "Personal" }],
        },
        providers: {
          list: async () => [{ id: "claude-code" }],
        },
      },
      log: { warn: vi.fn() },
    };
    sessions = createSessions(bb as never, store);
  });

  it("spawns a hidden profile thread with metadata, provider/model and source in the prompt", async () => {
    const profile = store.createProfile({ name: "Author One", source: "https://t.me/sample_channel" });
    const id = await sessions.startProfileSession(profile);
    expect(id).toBe("thr_Style · Author One");
    expect(spawn).toHaveBeenCalledTimes(1);
    const args = spawn.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.visibility).toBe("hidden");
    expect(args.pluginMetadata).toEqual({ kind: "profile", profileId: profile.id });
    expect(args.providerId).toBe("claude-code");
    expect(args.model).toBe("claude-opus-5-5");
    expect(args.prompt).toMatch(/https:\/\/t\.me\/sample_channel/u);
    expect(args.environment).toEqual({ type: "project-default" });
  });

  it("asks for texts when the profile has no source", async () => {
    const profile = store.createProfile({ name: "Author Two" });
    await sessions.startProfileSession(profile);
    const args = spawn.mock.calls[0]![0] as { prompt: string };
    expect(args.prompt).toMatch(/ask the user for a channel link or texts/u);
  });

  it("spawns a hidden post thread with post metadata and the brief", async () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft A" });
    await sessions.startPostSession(post, "write a hook about tools");
    const args = spawn.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.visibility).toBe("hidden");
    expect(args.pluginMetadata).toEqual({ kind: "post", postId: post.id });
    expect(args.providerId).toBe("claude-code");
    expect(args.model).toBe("claude-opus-5-5");
    expect(args.prompt).toMatch(/write a hook about tools/u);
    expect(args.title).toBe("telegram · Draft A");
  });
});

describe("agentConfiguration", () => {
  let store: Store;

  beforeEach(() => {
    store = makeStore();
  });

  it("selects style-portrait tools for a profile thread and writing tools for a post thread", () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "x", title: "Thread A" });
    const profileCfg = agentConfiguration(store, { pluginMetadata: { kind: "profile", profileId: profile.id } });
    expect(profileCfg.skills).toEqual(["style-portrait"]);
    expect(profileCfg.tools).toEqual([...PROFILE_TOOLS]);
    const postCfg = agentConfiguration(store, { pluginMetadata: { kind: "post", postId: post.id } });
    expect(postCfg.skills).toEqual(["writing-in-style", "style-portrait"]);
    expect(postCfg.tools).toEqual([...POST_TOOLS]);
  });

  it("returns empty tools and skills when the thread has no MyPosts metadata", () => {
    expect(agentConfiguration(store, { pluginMetadata: {} })).toEqual({ tools: [], skills: [] });
    expect(agentConfiguration(store, { pluginMetadata: { kind: "other" } })).toEqual({ tools: [], skills: [] });
  });

  it("puts platform rules, the profile name, and EN/RU tweet guidance in X post instructions", () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "x", title: "Thread A" });
    const text = postInstructions(post, profile);
    expect(text).toMatch(/Author One/u);
    expect(text).toBe(
      [
        "You are the copywriter of MyPosts.",
        `You work on post ${post.id} for profile Author One (${profile.id}).`,
        platformRules("x"),
        "After the first draft, never rewrite the post silently: every change is an mp_propose_edit, and you put its ::mp-edit{id=…} line on its own line in your reply.",
        "Each tweet needs English and Russian versions as {en, ru}.",
      ].join(" "),
    );
    const cfg = agentConfiguration(store, { pluginMetadata: { kind: "post", postId: post.id } });
    expect(cfg.instructions).toBe(text);
  });
});
