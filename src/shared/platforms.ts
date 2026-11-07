import { PLATFORMS_IDS, type Platform, type PostKind } from "./model";

export interface PlatformDef {
  id: Platform;
  limit: number | null;
  perTweet: boolean;
  maxTweets: number | null;
  bilingual: boolean;
  kinds: readonly PostKind[];
  kickoff: { en: string; ru: string };
}

export const PLATFORMS: Record<Platform, PlatformDef> = {
  telegram: {
    id: "telegram",
    limit: 4096,
    perTweet: false,
    maxTweets: null,
    bilingual: false,
    kinds: ["post", "article"],
    kickoff: { en: "Telegram", ru: "Telegram" },
  },
  x: {
    id: "x",
    limit: 280,
    perTweet: true,
    maxTweets: 25,
    bilingual: true,
    kinds: ["thread", "post"],
    kickoff: { en: "X", ru: "X" },
  },
  dzen: {
    id: "dzen",
    limit: null,
    perTweet: false,
    maxTweets: null,
    bilingual: false,
    kinds: ["article", "post"],
    kickoff: { en: "Dzen", ru: "Дзена" },
  },
  vk: {
    id: "vk",
    limit: 16384,
    perTweet: false,
    maxTweets: null,
    bilingual: false,
    kinds: ["post", "article"],
    kickoff: { en: "VK", ru: "ВКонтакте" },
  },
};

export const PLATFORM_LIST: readonly PlatformDef[] = PLATFORMS_IDS.map((id) => PLATFORMS[id]);

const URL_RE = /https?:\/\/\S+/gu;

export function countChars(platform: Platform, text: string): number {
  if (!platformDef(platform).perTweet) return [...text].length;
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

export function platformRules(id: Platform): string {
  const def = platformDef(id);
  const parts: string[] = [];
  if (def.bilingual) {
    parts.push(
      "Every tweet is written in English and Russian.",
      "Write EN first.",
      "RU is the same thought in the profile voice, not a literal translation.",
    );
  }
  if (def.limit !== null) {
    parts.push(
      def.perTweet
        ? `Each tweet is at most ${def.limit} characters (http(s) URLs count as 23).`
        : `The post is at most ${def.limit} characters.`,
    );
  }
  if (def.maxTweets !== null) {
    parts.push(`A thread is at most ${def.maxTweets} tweets.`);
  }
  if (def.kinds[0] === "article" && def.limit === null) {
    parts.push("Write a Dzen article with a title, H2 sections, and a cover suggestion.", "There is no hard character limit.");
  }
  return parts.join(" ");
}

export function platformDef(id: Platform): PlatformDef {
  return PLATFORMS[id];
}
