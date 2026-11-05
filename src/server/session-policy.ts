export type SessionKind = "profile" | "post";

type Filter = { mode: "allow" | "deny"; names: string[] };

export type MpSessionPolicy = {
  bbPlugins?: Filter;
  skills?: Filter;
  mcpServers?: Filter;
  nativePlugins?: Filter;
  userInstructions?: boolean;
  projectInstructions?: boolean;
  claudeAiSync?: boolean;
};

const POLICY_GROUP_KEYS = ["bbPlugins", "skills", "mcpServers", "nativePlugins"] as const;
const POLICY_SWITCH_KEYS = ["userInstructions", "projectInstructions", "claudeAiSync"] as const;

type PolicyGroupKey = (typeof POLICY_GROUP_KEYS)[number];
type PolicySwitchKey = (typeof POLICY_SWITCH_KEYS)[number];

type SessionPolicyAdvertisement = {
  version: number;
  providerGroups: Record<string, string[]>;
  instructionSwitches: Record<string, string[]>;
};

function readSessionPolicyAdvertisement(agents: unknown): SessionPolicyAdvertisement | null {
  try {
    const capability = (agents as { experimental_vkRequiredSessionPolicy?: unknown })
      .experimental_vkRequiredSessionPolicy;
    if (typeof capability !== "function") return null;
    const raw = capability();
    if (raw === null || typeof raw !== "object") return null;
    const ad = raw as Record<string, unknown>;
    if (ad.version !== 1) return null;
    if (typeof ad.providerGroups !== "object" || ad.providerGroups === null) return null;
    if (typeof ad.instructionSwitches !== "object" || ad.instructionSwitches === null) return null;
    return ad as SessionPolicyAdvertisement;
  } catch {
    return null;
  }
}

export function mpSessionPolicy(kind: SessionKind): MpSessionPolicy {
  return {
    bbPlugins: {
      mode: "allow",
      names: ["my-posts", "environment-project-checkout", "project-folders"],
    },
    skills: {
      mode: "allow",
      names:
        kind === "profile" ? ["style-portrait"] : ["writing-in-style", "style-portrait"],
    },
    mcpServers: { mode: "allow", names: ["bb-bridge"] },
    nativePlugins: { mode: "allow", names: [] },
    userInstructions: false,
    projectInstructions: false,
    claudeAiSync: false,
  };
}

export function sessionPolicyField(
  agents: unknown,
  providerId: string,
  kind: SessionKind,
): Record<string, unknown> {
  const advertisement = readSessionPolicyAdvertisement(agents);
  if (advertisement === null) return {};

  const groups = advertisement.providerGroups[providerId];
  const switches = advertisement.instructionSwitches[providerId];
  if (groups === undefined || switches === undefined) return {};

  const full = mpSessionPolicy(kind);
  const policy: MpSessionPolicy = {};

  for (const key of POLICY_GROUP_KEYS) {
    if (groups.includes(key)) {
      policy[key] = full[key as PolicyGroupKey];
    }
  }
  for (const key of POLICY_SWITCH_KEYS) {
    if (switches.includes(key)) {
      policy[key] = full[key as PolicySwitchKey];
    }
  }

  return {
    experimental_vkRequiredSessionPolicy: {
      version: 1,
      policy,
    },
  };
}
