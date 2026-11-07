import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import { createSessions } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

function spawnThatRefusesCompiledAgent() {
  return vi.fn(async (args: Record<string, unknown>) => {
    if ("experimental_vkCompiledMainAgent" in args) {
      throw new Error("boom-refused");
    }
    return { id: "thr_plain" };
  });
}

function makeBb(spawn: ReturnType<typeof vi.fn>, providerId: string) {
  const logWarn = vi.fn();
  const bb = {
    sdk: {
      threads: { spawn },
      projects: {
        list: async () => [{ id: "proj_personal", kind: "personal" as const, name: "Personal" }],
      },
      providers: {
        list: async () => [{ id: providerId }],
      },
    },
    agents: {
      experimental_vkCompiledMainAgent: vi.fn(),
      experimental_vkRequiredSessionPolicy: () => ({
        version: 1,
        providerGroups: {
          "claude-code": ["bbPlugins", "skills", "mcpServers", "nativePlugins"],
          codex: ["bbPlugins", "skills", "mcpServers", "nativePlugins"],
        },
        instructionSwitches: {
          "claude-code": ["userInstructions", "projectInstructions", "claudeAiSync"],
          codex: ["userInstructions", "projectInstructions", "claudeAiSync"],
        },
      }),
    },
    log: { warn: logWarn },
  };
  return { bb, logWarn };
}

function withoutCompiledAgent(args: Record<string, unknown>): Record<string, unknown> {
  const { experimental_vkCompiledMainAgent: _dropped, ...plain } = args;
  return plain;
}

describe("compiled-agent spawn fallback", () => {
  it("retries startProfileSession without the compiled agent after the hub refuses it", async () => {
    const store = makeStore();
    const spawn = spawnThatRefusesCompiledAgent();
    const { bb, logWarn } = makeBb(spawn, "claude-code");
    const sessions = createSessions(bb as never, store);
    const profile = store.createProfile({ name: "Author One", source: "https://t.me/sample_channel" });
    const id = await sessions.startProfileSession(profile);
    expect(id).toBe("thr_plain");
    expect(spawn).toHaveBeenCalledTimes(2);
    const first = spawn.mock.calls[0]![0] as Record<string, unknown>;
    const second = spawn.mock.calls[1]![0] as Record<string, unknown>;
    expect("experimental_vkCompiledMainAgent" in first).toBe(true);
    expect("experimental_vkCompiledMainAgent" in second).toBe(false);
    expect(second).toEqual(withoutCompiledAgent(first));
    expect("experimental_vkRequiredSessionPolicy" in first).toBe(true);
    expect(second.experimental_vkRequiredSessionPolicy).toEqual(first.experimental_vkRequiredSessionPolicy);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn.mock.calls[0]![0]).toBe(
      "MyPosts session spawn: the hub refused the compiled MyPosts agent (boom-refused); spawning without it.",
    );
  });

  it("retries startPostSession without the compiled agent after the hub refuses it", async () => {
    const store = makeStore();
    const spawn = spawnThatRefusesCompiledAgent();
    const { bb, logWarn } = makeBb(spawn, "claude-code");
    const sessions = createSessions(bb as never, store);
    const profile = store.createProfile({ name: "Author One" });
    const post = store.createPost({ profileId: profile.id, platform: "telegram", title: "Draft A" });
    const id = await sessions.startPostSession(post, "write a hook about tools");
    expect(id).toBe("thr_plain");
    expect(spawn).toHaveBeenCalledTimes(2);
    const first = spawn.mock.calls[0]![0] as Record<string, unknown>;
    const second = spawn.mock.calls[1]![0] as Record<string, unknown>;
    expect("experimental_vkCompiledMainAgent" in first).toBe(true);
    expect("experimental_vkCompiledMainAgent" in second).toBe(false);
    expect(second).toEqual(withoutCompiledAgent(first));
    expect(second.experimental_vkRequiredSessionPolicy).toEqual(first.experimental_vkRequiredSessionPolicy);
    expect(logWarn.mock.calls[0]![0]).toBe(
      "MyPosts session spawn: the hub refused the compiled MyPosts agent (boom-refused); spawning without it.",
    );
  });

  it("rethrows when spawn rejects and the args have no compiled agent field", async () => {
    const store = makeStore();
    store.setSettings({ providerId: "codex" });
    const spawn = vi.fn();
    const refused = new Error("boom-refused");
    const { bb, logWarn } = makeBb(spawn, "codex");
    spawn.mockRejectedValue(refused);
    const sessions = createSessions(bb as never, store);
    const profile = store.createProfile({ name: "Author One" });
    await expect(sessions.startProfileSession(profile)).rejects.toBe(refused);
    expect(spawn).toHaveBeenCalledTimes(1);
    const args = spawn.mock.calls[0]![0] as Record<string, unknown>;
    expect("experimental_vkCompiledMainAgent" in args).toBe(false);
    expect(logWarn).not.toHaveBeenCalled();
  });
});
