import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mpSessionPolicy, sessionPolicyField } from "../../src/server/session-policy";
import { createSessions } from "../../src/server/sessions";
import { MIGRATIONS, Store } from "../../src/server/store";

const CLAUDE_CODE_AD = {
  version: 1,
  providerGroups: {
    "claude-code": ["bbPlugins", "skills", "mcpServers", "nativePlugins"],
  },
  instructionSwitches: {
    "claude-code": ["userInstructions", "projectInstructions", "claudeAiSync"],
  },
};

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

function claudeCodeAgents(extra?: Record<string, unknown>) {
  return {
    experimental_vkRequiredSessionPolicy: () => CLAUDE_CODE_AD,
    ...extra,
  };
}

describe("mpSessionPolicy", () => {
  it("allows only style-portrait for profile sessions", () => {
    expect(mpSessionPolicy("profile").skills).toEqual({
      mode: "allow",
      names: ["style-portrait"],
    });
  });

  it("allows writing-in-style and style-portrait for post sessions", () => {
    expect(mpSessionPolicy("post").skills).toEqual({
      mode: "allow",
      names: ["writing-in-style", "style-portrait"],
    });
  });
});

describe("sessionPolicyField", () => {
  it("returns the narrowed claude-code profile policy when advertised", () => {
    const field = sessionPolicyField(claudeCodeAgents(), "claude-code", "profile");
    const wrapped = field.experimental_vkRequiredSessionPolicy as {
      version: number;
      policy: Record<string, unknown>;
    };
    expect(wrapped.version).toBe(1);
    expect(wrapped.policy.bbPlugins).toEqual({
      mode: "allow",
      names: ["my-posts", "environment-project-checkout", "project-folders"],
    });
    expect(wrapped.policy.skills).toEqual({
      mode: "allow",
      names: ["style-portrait"],
    });
    expect(wrapped.policy.mcpServers).toEqual({ mode: "allow", names: ["bb-bridge"] });
    expect(wrapped.policy.nativePlugins).toEqual({ mode: "allow", names: [] });
    expect(wrapped.policy.userInstructions).toBe(false);
    expect(wrapped.policy.projectInstructions).toBe(false);
    expect(wrapped.policy.claudeAiSync).toBe(false);
  });

  it("returns post skills for post kind", () => {
    const field = sessionPolicyField(claudeCodeAgents(), "claude-code", "post");
    const policy = (field.experimental_vkRequiredSessionPolicy as { policy: { skills: unknown } }).policy;
    expect(policy.skills).toEqual({
      mode: "allow",
      names: ["writing-in-style", "style-portrait"],
    });
  });

  it("omits groups and switches the provider does not advertise", () => {
    const agents = {
      experimental_vkRequiredSessionPolicy: () => ({
        version: 1,
        providerGroups: { "partial-provider": ["bbPlugins", "skills", "mcpServers"] },
        instructionSwitches: { "partial-provider": ["userInstructions"] },
      }),
    };
    const field = sessionPolicyField(agents, "partial-provider", "profile");
    const policy = (field.experimental_vkRequiredSessionPolicy as { policy: Record<string, unknown> }).policy;
    expect(policy.nativePlugins).toBeUndefined();
    expect(policy.projectInstructions).toBeUndefined();
    expect(policy.claudeAiSync).toBeUndefined();
    expect(policy.userInstructions).toBe(false);
    expect(policy.bbPlugins).toEqual({
      mode: "allow",
      names: ["my-posts", "environment-project-checkout", "project-folders"],
    });
    expect(policy.skills).toEqual({
      mode: "allow",
      names: ["style-portrait"],
    });
    expect(policy.mcpServers).toEqual({ mode: "allow", names: ["bb-bridge"] });
  });

  it("returns {} when agents lack the capability", () => {
    expect(sessionPolicyField({}, "claude-code", "profile")).toEqual({});
  });

  it("returns {} for an unknown provider", () => {
    expect(sessionPolicyField(claudeCodeAgents(), "unknown-provider", "profile")).toEqual({});
  });

  it("returns {} when the capability throws", () => {
    const agents = {
      experimental_vkRequiredSessionPolicy: () => {
        throw new Error("capability unavailable");
      },
    };
    expect(sessionPolicyField(agents, "claude-code", "profile")).toEqual({});
  });
});

describe("createSessions session policy", () => {
  let store: Store;
  let spawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = makeStore();
    spawn = vi.fn(async (args: { title: string }) => ({ id: `thr_${args.title}` }));
  });

  it("passes experimental_vkRequiredSessionPolicy when claude-code is advertised", async () => {
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
      agents: claudeCodeAgents(),
      log: { warn: vi.fn(), info: vi.fn() },
    };
    const sessions = createSessions(bb as never, store);
    const profile = store.createProfile({ name: "Author One" });
    await sessions.startProfileSession(profile);
    expect(spawn).toHaveBeenCalledTimes(1);
    const args = spawn.mock.calls[0]![0] as Record<string, unknown>;
    const policyWrap = args.experimental_vkRequiredSessionPolicy as { version: number };
    expect(policyWrap.version).toBe(1);
    expect(args.experimental_vkRequiredSessionPolicy).toEqual({
      version: 1,
      policy: mpSessionPolicy("profile"),
    });
  });
});
