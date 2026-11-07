import type { BbPluginApi, PluginAgentConfiguration } from "@get-bb/plugin-sdk";
import { z } from "zod";
import type { KickoffLocale } from "../shared/contract";
import type { Post, Profile } from "../shared/model";
import { compiledAgentField } from "./compiled-agent";
import { profileRebuildKickoff, SESSION_KINDS } from "./kinds";
import { sessionPolicyField } from "./session-policy";
import type { Store } from "./store";

export type SessionStarter = {
  startProfileSession(
    profile: Profile,
    locale?: KickoffLocale,
    mode?: "build" | "rebuild",
  ): Promise<string>;
  startPostSession(post: Post, brief: string | null, locale?: KickoffLocale): Promise<string>;
};

export {
  postInstructions,
  postKickoff,
  profileInstructions,
  profileKickoff,
} from "./kinds";

export const sessionMetadataSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("profile"), profileId: z.string().min(1) }),
  z.object({ kind: z.literal("post"), postId: z.string().min(1) }),
]);

export function agentConfiguration(
  store: Store,
  context: { pluginMetadata: unknown },
): PluginAgentConfiguration {
  const none: PluginAgentConfiguration = { tools: [], skills: [] };
  const meta = sessionMetadataSchema.safeParse(context.pluginMetadata);
  if (!meta.success) return none;
  try {
    if (meta.data.kind === "profile") {
      const profile = store.getProfile(meta.data.profileId);
      const kind = SESSION_KINDS.profile;
      return {
        tools: [...kind.tools],
        skills: [...kind.skills],
        instructions: kind.instructions({ profile }),
      };
    }
    const post = store.getPost(meta.data.postId);
    const profile = store.getProfile(post.profileId);
    const kind = SESSION_KINDS.post;
    return {
      tools: [...kind.tools],
      skills: [...kind.skills],
      instructions: kind.instructions({ profile, post }),
    };
  } catch {
    return none;
  }
}

async function resolveProjectId(bb: BbPluginApi, projectId: string | null): Promise<string> {
  if (projectId !== null && projectId !== "") return projectId;
  const projects = await bb.sdk.projects.list({ includePersonal: true });
  const personal = projects.find((project) => project.kind === "personal");
  const chosen = personal ?? projects[0];
  if (chosen === undefined) throw new Error("No BB project is available to spawn a MyPosts session.");
  return chosen.id;
}

async function spawnArgs(
  bb: BbPluginApi,
  store: Store,
  title: string,
  prompt: string,
  pluginMetadata: { kind: "profile"; profileId: string } | { kind: "post"; postId: string },
): Promise<Parameters<BbPluginApi["sdk"]["threads"]["spawn"]>[0]> {
  const settings = store.getSettings();
  const projectId = await resolveProjectId(bb, settings.projectId);
  const args: Parameters<BbPluginApi["sdk"]["threads"]["spawn"]>[0] = {
    projectId,
    environment: { type: "project-default" },
    prompt,
    title,
    visibility: "hidden",
    pluginMetadata,
  };
  let installed = true;
  try {
    const providers = await bb.sdk.providers.list();
    installed = providers.some((provider) => provider.id === settings.providerId);
  } catch {
    installed = true;
  }
  if (installed) {
    args.providerId = settings.providerId;
    args.model = settings.model;
    const policyField = sessionPolicyField(bb.agents, settings.providerId, pluginMetadata.kind);
    if (Object.keys(policyField).length > 0) {
      Object.assign(args as unknown as Record<string, unknown>, policyField);
      bb.log.info?.("MyPosts session spawn: narrowed BB context policy applied.");
    } else {
      bb.log.info?.("MyPosts session spawn: using BB default context (no session policy capability).");
    }
    const compiledField = compiledAgentField(bb.agents, settings.providerId, pluginMetadata.kind);
    if (Object.keys(compiledField).length > 0) {
      Object.assign(args as unknown as Record<string, unknown>, compiledField);
      bb.log.info?.("MyPosts session spawn: compiled MyPosts agent applied.");
    }
  } else {
    bb.log.warn(`Provider ${settings.providerId} is not installed; spawning the MyPosts session with BB defaults.`);
  }
  return args;
}

type SpawnArgs = Parameters<BbPluginApi["sdk"]["threads"]["spawn"]>[0];

function spawnRefusalText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (error === null || typeof error !== "object") return message;
  const extra = error as { code?: unknown; detail?: unknown };
  const parts = [message];
  if (extra.code !== undefined) parts.push(`code=${String(extra.code)}`);
  if (extra.detail !== undefined) parts.push(`detail=${String(extra.detail)}`);
  return parts.join(" ");
}

async function spawnSession(bb: BbPluginApi, args: SpawnArgs): Promise<{ id: string }> {
  try {
    return await bb.sdk.threads.spawn(args);
  } catch (error) {
    const record = args as unknown as Record<string, unknown>;
    if (!("experimental_vkCompiledMainAgent" in record)) throw error;
    bb.log.warn(
      `MyPosts session spawn: the hub refused the compiled MyPosts agent (${spawnRefusalText(error)}); spawning without it.`,
    );
    const { experimental_vkCompiledMainAgent: _dropped, ...plain } = record;
    return await bb.sdk.threads.spawn(plain as unknown as SpawnArgs);
  }
}

export function createSessions(bb: BbPluginApi, store: Store): SessionStarter {
  return {
    async startProfileSession(profile: Profile, locale: KickoffLocale = "en", mode: "build" | "rebuild" = "build") {
      const prompt =
        mode === "rebuild"
          ? profileRebuildKickoff(profile, locale)
          : SESSION_KINDS.profile.kickoff({ profile }, locale);
      const thread = await spawnSession(
        bb,
        await spawnArgs(bb, store, `Style · ${profile.name}`, prompt, {
          kind: "profile",
          profileId: profile.id,
        }),
      );
      return thread.id;
    },
    async startPostSession(post: Post, brief: string | null, locale: KickoffLocale = "en") {
      const profile = store.getProfile(post.profileId);
      const thread = await spawnSession(
        bb,
        await spawnArgs(
          bb,
          store,
          `${post.platform} · ${post.title}`,
          SESSION_KINDS.post.kickoff({ profile, post, brief }, locale),
          {
            kind: "post",
            postId: post.id,
          },
        ),
      );
      return thread.id;
    },
  };
}
