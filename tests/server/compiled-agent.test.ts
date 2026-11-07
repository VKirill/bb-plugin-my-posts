import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import { compiledAgentField, compiledMainAgent } from "../../src/server/compiled-agent";
import { SESSION_KINDS } from "../../src/server/kinds";
import { mpSessionPolicy } from "../../src/server/session-policy";
import { createSessions } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";

const ALLOWED_KEYS = [
  "id",
  "sourceVersion",
  "sourceHash",
  "description",
  "prompt",
  "tools",
  "skills",
  "mcpServers",
] as const;

const TOOLS = ["Bash", "Read", "Write", "Edit", "Skill"];

describe("compiledMainAgent", () => {
  it("builds a copywriter profile for post sessions", () => {
    const agent = compiledMainAgent("post");
    expect(agent.id).toBe("mp-copywriter");
    expect(agent.tools).toEqual(TOOLS);
    expect(agent.skills).toEqual([...SESSION_KINDS.post.skills]);
    expect(agent.mcpServers).toEqual(["bb-bridge"]);
    expect(Object.keys(agent).sort()).toEqual([...ALLOWED_KEYS].sort());
    expect("model" in agent).toBe(false);
    expect("permissionMode" in agent).toBe(false);
    expect(agent.prompt.length).toBeLessThan(4000);
    expect(agent.prompt).toContain("mp_profile_get");
    expect(agent.prompt).toContain("mp_post_write");
    expect(agent.prompt).toContain("mp_propose_edit");
    expect(agent.sourceHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("builds a style-portrait profile for profile sessions", () => {
    const agent = compiledMainAgent("profile");
    expect(agent.id).toBe("mp-style-portrait");
    expect(agent.skills).toEqual([...SESSION_KINDS.profile.skills]);
    expect(agent.tools).toEqual(TOOLS);
    expect(agent.prompt).toContain("mp_fetch_telegram");
    expect(agent.prompt).toContain("mp_profile_save");
  });
});

describe("compiledAgentField", () => {
  it("returns the compiled agent only for claude-code when the capability is a function, and never calls it", () => {
    const capability = vi.fn();
    expect(compiledAgentField({ experimental_vkCompiledMainAgent: capability }, "codex", "post")).toEqual(
      {},
    );
    expect(compiledAgentField({}, "claude-code", "post")).toEqual({});
    expect(
      compiledAgentField({ experimental_vkCompiledMainAgent: capability }, "claude-code", "post"),
    ).toEqual({ experimental_vkCompiledMainAgent: compiledMainAgent("post") });
    expect(capability).not.toHaveBeenCalled();
  });
});

describe("spawnArgs compiled agent merge", () => {
  it("merges the compiled agent next to the session policy on claude-code", async () => {
    const db = new Database(":memory:");
    for (const sql of MIGRATIONS) db.exec(sql);
    const store = new Store(db);
    const spawn = vi.fn(async (args: { title: string }) => ({ id: `thr_${args.title}` }));
    const capability = vi.fn();
    const log = { info: vi.fn(), warn: vi.fn() };
    const sessions = createSessions(
      {
        sdk: {
          threads: { spawn },
          projects: {
            list: async () => [{ id: "proj_personal", kind: "personal" as const, name: "Personal" }],
          },
          providers: {
            list: async () => [{ id: "claude-code" }],
          },
        },
        agents: {
          experimental_vkCompiledMainAgent: capability,
          experimental_vkRequiredSessionPolicy: () => ({
            version: 1,
            providerGroups: {
              "claude-code": ["bbPlugins", "skills", "mcpServers", "nativePlugins"],
            },
            instructionSwitches: {
              "claude-code": ["userInstructions", "projectInstructions", "claudeAiSync"],
            },
          }),
        },
        log,
      } as never,
      store,
    );
    const profile = store.createProfile({ name: "Author One", source: "https://t.me/sample_channel" });
    await sessions.startProfileSession(profile);
    const args = spawn.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.experimental_vkCompiledMainAgent).toEqual(compiledMainAgent("profile"));
    expect(args.experimental_vkRequiredSessionPolicy).toEqual({
      version: 1,
      policy: mpSessionPolicy("profile"),
    });
    expect(capability).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith("MyPosts session spawn: narrowed BB context policy applied.");
    expect(log.info).toHaveBeenCalledWith("MyPosts session spawn: compiled MyPosts agent applied.");
  });
});
