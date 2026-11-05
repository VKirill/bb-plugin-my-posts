import type { BbPluginApi, PluginAgentConfiguration } from "@get-bb/plugin-sdk";
import { z } from "zod";
import type { Post, Profile } from "../shared/model";
import { platformRules } from "../shared/platforms";
import type { SessionStarter } from "./rpc";
import type { Store } from "./store";
import { POST_TOOLS, PROFILE_TOOLS } from "./tools";

export const sessionMetadataSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("profile"), profileId: z.string().min(1) }),
  z.object({ kind: z.literal("post"), postId: z.string().min(1) }),
]);

const SOURCE_FALLBACK = "ask the user for a channel link or texts";

export function profileKickoff(profile: Profile): string {
  const source = profile.source.trim() === "" ? SOURCE_FALLBACK : profile.source.trim();
  return [
    `Build the style profile ${profile.name} with the style-portrait skill.`,
    `Source: ${source}.`,
    "For a public Telegram channel call mp_fetch_telegram and save the corpus with style.py corpus.",
    "When done call mp_profile_save with style.md, metrics json and 4–6 short voice traits.",
  ].join(" ");
}

export function postKickoff(post: Post, profile: Profile, brief: string | null): string {
  const briefText = brief === null || brief.trim() === "" ? "(none)" : brief.trim();
  return [
    `Write a ${post.platform} ${post.kind} for profile ${profile.name} with the writing-in-style skill.`,
    `Brief: ${briefText}.`,
    "Load the profile with mp_profile_get, write the draft with mp_post_write, and propose later edits with mp_propose_edit.",
  ].join(" ");
}

export function profileInstructions(profile: Profile): string {
  return [
    "You are the style analyst of MyPosts.",
    `You work on profile ${profile.id} (${profile.name}).`,
    "Working files go to this thread's working storage.",
    "The plugin database is the source of truth: when the portrait is ready, save it with mp_profile_save.",
  ].join(" ");
}

export function postInstructions(post: Post, profile: Profile): string {
  const lines = [
    "You are the copywriter of MyPosts.",
    `You work on post ${post.id} for profile ${profile.name} (${profile.id}).`,
    platformRules(post.platform),
    "After the first draft, never rewrite the post silently: every change is an mp_propose_edit, and you put its ::mp-edit{id=…} line on its own line in your reply.",
  ];
  if (post.platform === "x") {
    lines.push("Each tweet needs English and Russian versions as {en, ru}.");
  }
  return lines.join(" ");
}

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
      return {
        tools: [...PROFILE_TOOLS],
        skills: ["style-portrait"],
        instructions: profileInstructions(profile),
      };
    }
    const post = store.getPost(meta.data.postId);
    const profile = store.getProfile(post.profileId);
    return {
      tools: [...POST_TOOLS],
      skills: ["writing-in-style", "style-portrait"],
      instructions: postInstructions(post, profile),
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
  } else {
    bb.log.warn(`Provider ${settings.providerId} is not installed; spawning the MyPosts session with BB defaults.`);
  }
  return args;
}

export function createSessions(bb: BbPluginApi, store: Store): SessionStarter {
  return {
    async startProfileSession(profile: Profile) {
      const thread = await bb.sdk.threads.spawn(
        await spawnArgs(bb, store, `Style · ${profile.name}`, profileKickoff(profile), {
          kind: "profile",
          profileId: profile.id,
        }),
      );
      return thread.id;
    },
    async startPostSession(post: Post, brief: string | null) {
      const profile = store.getProfile(post.profileId);
      const thread = await bb.sdk.threads.spawn(
        await spawnArgs(bb, store, `${post.platform} · ${post.title}`, postKickoff(post, profile, brief), {
          kind: "post",
          postId: post.id,
        }),
      );
      return thread.id;
    },
  };
}
