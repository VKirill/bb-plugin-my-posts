import { z } from "zod";

export const MP_CHANGED = "my-posts:changed";

export const PLATFORMS_IDS = ["telegram", "x", "dzen", "vk"] as const;
export const platformSchema = z.enum(PLATFORMS_IDS);
export type Platform = z.infer<typeof platformSchema>;

export const LOCALES = ["ru", "en"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const LANGUAGE_IDS = ["auto", "ru", "en"] as const;
export const languageSchema = z.enum(LANGUAGE_IDS);
export type Language = z.infer<typeof languageSchema>;

export const POST_KINDS = ["post", "article", "thread"] as const;
export const postKindSchema = z.enum(POST_KINDS);
export type PostKind = z.infer<typeof postKindSchema>;

export const PROFILE_STATUSES = ["building", "ready", "lowdata"] as const;
export const profileStatusSchema = z.enum(PROFILE_STATUSES);
export type ProfileStatus = z.infer<typeof profileStatusSchema>;

export const POST_STATUSES = ["draft", "writing", "ready", "published"] as const;
export const postStatusSchema = z.enum(POST_STATUSES);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const TWEET_LANGS = ["en", "ru"] as const;
export const tweetLangSchema = z.enum(TWEET_LANGS);
export type TweetLang = z.infer<typeof tweetLangSchema>;

export const tweetSchema = z.object({
  en: z.string(),
  ru: z.string(),
  ruStale: z.boolean(),
});
export type Tweet = z.infer<typeof tweetSchema>;

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  status: profileStatusSchema,
  styleMd: z.string(),
  metrics: z.record(z.string(), z.unknown()),
  traits: z.array(z.string()),
  styleThreadId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export const postSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  platform: platformSchema,
  kind: postKindSchema,
  title: z.string(),
  status: postStatusSchema,
  body: z.string(),
  tweets: z.array(tweetSchema),
  threadId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Post = z.infer<typeof postSchema>;

export const proposalTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("body") }),
  z.object({ kind: z.literal("tweet"), index: z.number().int().nonnegative(), lang: tweetLangSchema }),
]);
export type ProposalTarget = z.infer<typeof proposalTargetSchema>;

export const PROPOSAL_STATUSES = ["pending", "applied", "rejected"] as const;
export const proposalStatusSchema = z.enum(PROPOSAL_STATUSES);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const proposalSchema = z.object({
  id: z.string(),
  postId: z.string(),
  target: proposalTargetSchema,
  before: z.string(),
  after: z.string(),
  note: z.string(),
  status: proposalStatusSchema,
  createdAt: z.string(),
});
export type Proposal = z.infer<typeof proposalSchema>;

export const settingsSchema = z.object({
  providerId: z.string(),
  model: z.string(),
  projectId: z.string().nullable(),
  language: languageSchema,
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  providerId: "claude-code",
  model: "claude-opus-5-5",
  projectId: null,
  language: "auto",
};

export const emptyTweet = (): Tweet => ({ en: "", ru: "", ruStale: false });
