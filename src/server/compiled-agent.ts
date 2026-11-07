import { createHash } from "node:crypto";
import { SESSION_KINDS, type SessionKind } from "./kinds";

const TOOLS = ["Bash", "Read", "Write", "Edit", "Skill"] as const;
const SOURCE_VERSION = "1";

export type CompiledMainAgent = {
  id: string;
  sourceVersion: string;
  sourceHash: string;
  description: string;
  prompt: string;
  tools: string[];
  skills: string[];
  mcpServers: string[];
};

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

function profilePrompt(): string {
  const tools = SESSION_KINDS.profile.tools.join(", ");
  return [
    "You are the MyPosts style analyst, working inside BB on one style profile.",
    "Work order: load the profile with mp_profile_get.",
    "For a public Telegram channel call mp_fetch_telegram.",
    "Use the style-portrait skill and run style.py via Bash.",
    "When done, save with mp_profile_save.",
    `Plugin tools: ${tools}.`,
    "Reply in the language of the user's message. Be brief in chat.",
    "Write files only in this thread's working folder or /tmp. Never touch other repositories.",
  ].join(" ");
}

function postPrompt(): string {
  const tools = SESSION_KINDS.post.tools.join(", ");
  return [
    "You are the MyPosts copywriter, working inside BB on one post.",
    "Work order: load the profile with mp_profile_get.",
    "Use the writing-in-style skill.",
    "Write the first draft with mp_post_write.",
    "Every later change is an mp_propose_edit; put its ::mp-edit{id=…} line on its own line in your reply.",
    `Plugin tools: ${tools}.`,
    "Reply in the language of the user's message. Be brief in chat.",
    "Write files only in this thread's working folder or /tmp. Never touch other repositories.",
  ].join(" ");
}

export function compiledMainAgent(kind: SessionKind): CompiledMainAgent {
  const prompt = kind === "profile" ? profilePrompt() : postPrompt();
  return {
    id: kind === "profile" ? "mp-style-portrait" : "mp-copywriter",
    sourceVersion: SOURCE_VERSION,
    sourceHash: hashPrompt(prompt),
    description:
      kind === "profile"
        ? "MyPosts style-portrait agent for one profile."
        : "MyPosts copywriter agent for one post.",
    prompt,
    tools: [...TOOLS],
    skills: [...SESSION_KINDS[kind].skills],
    mcpServers: ["bb-bridge"],
  };
}

export function compiledAgentField(
  agents: unknown,
  providerId: string,
  kind: SessionKind,
): Record<string, unknown> {
  if (providerId !== "claude-code") return {};
  const capability = (agents as { experimental_vkCompiledMainAgent?: unknown } | null)
    ?.experimental_vkCompiledMainAgent;
  if (typeof capability !== "function") return {};
  return { experimental_vkCompiledMainAgent: compiledMainAgent(kind) };
}
