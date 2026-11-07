import type { KickoffLocale } from "../shared/contract";
import type { Post, PostKind, Profile } from "../shared/model";
import { platformDef, platformRules, PLATFORMS } from "../shared/platforms";
import { POST_TOOLS, PROFILE_TOOLS, type ToolName } from "./tools";

export type SessionKind = "profile" | "post";

export type SessionKindContext = {
  profile: Profile;
  post?: Post;
  brief?: string | null;
};

export type SessionKindDef = {
  skills: readonly string[];
  tools: readonly ToolName[];
  instructions: (ctx: SessionKindContext) => string;
  kickoff: (ctx: SessionKindContext, locale: KickoffLocale) => string;
};

function postKindKickoff(kind: PostKind, locale: KickoffLocale): string {
  if (locale === "ru") {
    if (kind === "article") return "статью";
    if (kind === "thread") return "тред";
    return "пост";
  }
  if (kind === "article") return "article";
  if (kind === "thread") return "thread";
  return "post";
}

export function profileKickoff(profile: Profile, locale: KickoffLocale = "en"): string {
  const name = profile.name;
  const sourceTrim = profile.source.trim();
  if (locale === "ru") {
    const sourcePart =
      sourceTrim === ""
        ? "Источник: попроси у меня ссылку на канал или тексты"
        : `Источник: ${sourceTrim}`;
    return `Собери портрет стиля профиля «${name}». ${sourcePart}`;
  }
  const sourcePart =
    sourceTrim === ""
      ? "Source: ask the user for a channel link or texts"
      : `Source: ${sourceTrim}`;
  return `Build the style portrait of profile «${name}». ${sourcePart}`;
}

export function postKickoff(
  post: Post,
  profile: Profile,
  brief: string | null,
  locale: KickoffLocale = "en",
): string {
  const name = profile.name;
  const platform = PLATFORMS[post.platform].kickoff[locale];
  const kind = postKindKickoff(post.kind, locale);
  const briefTrim = brief === null ? "" : brief.trim();
  if (locale === "ru") {
    const base = `Напиши ${kind} для ${platform} в голосе профиля «${name}»`;
    return briefTrim === "" ? base : `${base}. Бриф: ${briefTrim}`;
  }
  const base = `Write a ${platform} ${kind} in the voice of profile «${name}».`;
  return briefTrim === "" ? base : `${base} Brief: ${briefTrim}`;
}

export function profileInstructions(profile: Profile): string {
  return [
    "You are the style analyst of MyPosts.",
    `You work on profile ${profile.id} (${profile.name}).`,
    "Working files go to this thread's working storage.",
    "Use the style-portrait skill. For a public Telegram channel call mp_fetch_telegram and save the corpus with style.py corpus.",
    "When done call mp_profile_save with style.md, metrics json and 4–6 short voice traits. The plugin database is the source of truth.",
    "Answer the user in the language of their message.",
  ].join(" ");
}

export function postInstructions(post: Post, profile: Profile): string {
  const lines = [
    "You are the copywriter of MyPosts.",
    `You work on post ${post.id} for profile ${profile.name} (${profile.id}).`,
    "Use the writing-in-style skill. Load the profile with mp_profile_get, write the draft with mp_post_write, and propose every later change with mp_propose_edit.",
    platformRules(post.platform),
    "After the first draft, never rewrite the post silently: every change is an mp_propose_edit, and you put its ::mp-edit{id=…} line on its own line in your reply.",
  ];
  if (platformDef(post.platform).perTweet) {
    lines.push("Each tweet needs English and Russian versions as {en, ru}.");
  }
  return lines.join(" ");
}

export const SESSION_KINDS: Record<SessionKind, SessionKindDef> = {
  profile: {
    skills: ["style-portrait"],
    tools: PROFILE_TOOLS,
    instructions: (ctx) => profileInstructions(ctx.profile),
    kickoff: (ctx, locale) => profileKickoff(ctx.profile, locale),
  },
  post: {
    skills: ["writing-in-style", "style-portrait"],
    tools: POST_TOOLS,
    instructions: (ctx) => {
      if (ctx.post === undefined) throw new Error("Post session kind needs a post.");
      return postInstructions(ctx.post, ctx.profile);
    },
    kickoff: (ctx, locale) => {
      if (ctx.post === undefined) throw new Error("Post session kind needs a post.");
      return postKickoff(ctx.post, ctx.profile, ctx.brief ?? null, locale);
    },
  },
};
