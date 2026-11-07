import type { Platform } from "../../shared/model";
import { PLATFORMS } from "../../shared/platforms";

type Locale = "en" | "ru";

type PlatformCopy = { label: string; hint: string; rules: string };

function limitLine(locale: Locale, limit: number): string {
  return locale === "en" ? `up to ${limit} chars` : `до ${limit} знаков`;
}

function xLine(locale: Locale): string {
  const { limit, maxTweets } = PLATFORMS.x;
  return locale === "en"
    ? `${limit} per tweet · every tweet in EN and RU · thread up to ${maxTweets}`
    : `${limit} на твит · каждый твит на EN и RU · тред до ${maxTweets}`;
}

function facts(locale: Locale, id: Platform): Pick<PlatformCopy, "hint" | "rules"> {
  const def = PLATFORMS[id];
  if (def.perTweet) {
    const line = xLine(locale);
    return { hint: line, rules: line };
  }
  if (def.limit !== null) {
    const line = limitLine(locale, def.limit);
    return { hint: line, rules: line };
  }
  const line = locale === "en" ? "article · title, H2 headings" : "статья · заголовок, подзаголовки H2";
  return { hint: line, rules: line };
}

export const platformCopy: Record<Locale, Record<Platform, PlatformCopy>> = {
  en: {
    telegram: { label: "Telegram", ...facts("en", "telegram") },
    x: { label: "X", ...facts("en", "x") },
    dzen: { label: "Dzen", ...facts("en", "dzen") },
    vk: { label: "VK", ...facts("en", "vk") },
  },
  ru: {
    telegram: { label: "Telegram", ...facts("ru", "telegram") },
    x: { label: "X", ...facts("ru", "x") },
    dzen: { label: "Дзен", ...facts("ru", "dzen") },
    vk: { label: "ВКонтакте", ...facts("ru", "vk") },
  },
};
