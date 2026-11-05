import type { Platform, PostKind } from "./model";

export interface PlatformDef {
  id: Platform;
  limit: number | null;
  defaultKind: PostKind;
  perTweet?: boolean;
  maxTweets?: number;
}

export const PLATFORMS: readonly PlatformDef[] = [
  { id: "telegram", limit: 4096, defaultKind: "post" },
  { id: "x", limit: 280, perTweet: true, maxTweets: 25, defaultKind: "thread" },
  { id: "dzen", limit: null, defaultKind: "article" },
  { id: "vk", limit: 16384, defaultKind: "post" },
];

const URL_RE = /https?:\/\/\S+/gu;

export function countChars(platform: Platform, text: string): number {
  if (platform !== "x") return [...text].length;
  let count = 0;
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    count += [...text.slice(last, index)].length;
    count += 23;
    last = index + match[0].length;
  }
  count += [...text.slice(last)].length;
  return count;
}

export function readingMinutes(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return Math.ceil(trimmed.split(/\s+/u).length / 180);
}

const RULES: Record<Platform, string> = {
  x: [
    "Every tweet is written in English and Russian.",
    "Write EN first.",
    "RU is the same thought in the profile voice, not a literal translation.",
    "Each tweet is at most 280 characters (http(s) URLs count as 23).",
    "A thread is at most 25 tweets.",
  ].join(" "),
  telegram: [
    "Use Telegram Markdown: bold, italic, and links.",
    "Put the hook in the first line.",
    "The post is at most 4096 characters.",
  ].join(" "),
  dzen: [
    "Write a Dzen article with a title, H2 sections, and a cover suggestion.",
    "There is no hard character limit.",
  ].join(" "),
  vk: [
    "The post is at most 16384 characters.",
    "Optionally include an attachments list and a poll suggestion.",
  ].join(" "),
};

export function platformRules(platform: Platform): string {
  return RULES[platform];
}

export function platformDef(platform: Platform): PlatformDef {
  const found = PLATFORMS.find((row) => row.id === platform);
  if (found === undefined) throw new Error(`Unknown platform "${platform}".`);
  return found;
}
