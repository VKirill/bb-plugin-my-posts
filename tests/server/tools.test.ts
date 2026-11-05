import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentConfiguration } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";
import { POST_TOOLS, PROFILE_TOOLS, registerTools } from "../../src/server/tools";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

type Tool = {
  name: string;
  execute: (args: never, ctx: { threadId: string; projectId: string; signal: AbortSignal }) => unknown;
};

describe("registerTools", () => {
  let store: Store;
  let changed: ReturnType<typeof vi.fn>;
  let tools: Map<string, Tool>;
  const signal = new AbortController().signal;

  beforeEach(() => {
    store = makeStore();
    changed = vi.fn();
    tools = new Map();
    const bb = {
      agents: {
        registerTool: (tool: Tool) => {
          tools.set(tool.name, tool);
        },
      },
    };
    registerTools(bb as never, store, changed);
  });

  function ctx(threadId: string) {
    return { threadId, projectId: "proj_personal", signal };
  }

  it("mp_profile_save stores the portrait, sets ready or lowdata, and publishes a change", async () => {
    const profile = store.createProfile({ name: "Author One" });
    store.updateProfile(profile.id, { styleThreadId: "thr_style" });
    const ready = await tools.get("mp_profile_save")!.execute(
      {
        profileId: profile.id,
        styleMd: "# Voice",
        metrics: { avgSentence: 12 },
        traits: ["short lines", "dry humour"],
      } as never,
      ctx("thr_style"),
    );
    expect(ready).toBe(`Saved profile ${profile.id} as ready.`);
    expect(store.getProfile(profile.id)).toMatchObject({
      styleMd: "# Voice",
      metrics: { avgSentence: 12 },
      traits: ["short lines", "dry humour"],
      status: "ready",
    });
    expect(changed).toHaveBeenCalledWith({ profileId: profile.id });

    const low = await tools.get("mp_profile_save")!.execute(
      {
        profileId: profile.id,
        styleMd: "# Voice",
        metrics: {},
        traits: ["sparse"],
        lowData: true,
      } as never,
      ctx("thr_style"),
    );
    expect(low).toBe(`Saved profile ${profile.id} as lowdata.`);
    expect(store.getProfile(profile.id).status).toBe("lowdata");
  });

  it("mp_propose_edit stores a pending proposal and returns the ::mp-edit directive line", async () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft A", body: "alpha beta" });
    store.updatePost(post.id, { threadId: "thr_post" });
    const text = (await tools.get("mp_propose_edit")!.execute(
      {
        postId: post.id,
        target: { kind: "body" },
        before: "alpha",
        after: "gamma",
        note: "shorter hook",
      } as never,
      ctx("thr_post"),
    )) as string;
    const proposals = store.listProposals(post.id);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.status).toBe("pending");
    expect(proposals[0]!.before).toBe("alpha");
    expect(proposals[0]!.after).toBe("gamma");
    expect(text).toBe(`Proposal stored. Put this line in your reply on its own line:\n::mp-edit{id="${proposals[0]!.id}"}`);
    expect(changed).toHaveBeenCalledWith({ profileId: profile.id, postId: post.id });
  });

  it("mp_post_write applies the same ruStale rule as post_update", async () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "x", title: "Thread A" });
    store.updatePost(post.id, { threadId: "thr_post" });
    const written = JSON.parse(
      (await tools.get("mp_post_write")!.execute(
        {
          postId: post.id,
          tweets: [{ en: "Hello there", ru: "", ruStale: false }],
        } as never,
        ctx("thr_post"),
      )) as string,
    ) as { tweets: unknown };
    expect(written.tweets).toEqual([{ en: "Hello there", ru: "", ruStale: true }]);
    const cleared = JSON.parse(
      (await tools.get("mp_post_write")!.execute(
        {
          postId: post.id,
          tweets: [{ en: "Hello there", ru: "Привет", ruStale: true }],
        } as never,
        ctx("thr_post"),
      )) as string,
    ) as { tweets: unknown };
    expect(cleared.tweets).toEqual([{ en: "Hello there", ru: "Привет", ruStale: false }]);
  });

  it("wires the same configure output the plugin uses for each thread kind", () => {
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "vk", title: "Wall A" });
    expect(agentConfiguration(store, { pluginMetadata: { kind: "profile", profileId: profile.id } }).tools).toEqual([
      ...PROFILE_TOOLS,
    ]);
    expect(agentConfiguration(store, { pluginMetadata: { kind: "post", postId: post.id } }).tools).toEqual([...POST_TOOLS]);
    expect(agentConfiguration(store, { pluginMetadata: {} })).toEqual({ tools: [], skills: [] });
  });
});
