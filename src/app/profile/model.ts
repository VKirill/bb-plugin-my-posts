import type { Platform, Post, PostKind, Profile, ProfileStatus } from "../../shared/model";
import { platformDef } from "../../shared/platforms";
import { profile as profileCopy } from "../i18n/profile";
import type { Route } from "../routes";

export type ProfileLocale = "en" | "ru";

export interface MetricRow {
  label: string;
  value: string;
}

export type LayerState = "ready" | "running" | "waiting";

export interface PortraitLayers {
  a: LayerState;
  b: LayerState;
  c: LayerState;
}

export interface RailCounts {
  all: number;
  telegram: number;
  x: number;
  dzen: number;
  vk: number;
}

export const LAST_PROFILE_KEY = "my-posts:last-profile-id";

const VOICE_HEADING = /##\s*.*(голос|voice)/iu;
const RULES_HEADING = /##\s*.*(правил|writing rules|generation rules)/iu;

function layerState(isReady: boolean, status: ProfileStatus): LayerState {
  if (isReady) return "ready";
  if (status === "building") return "running";
  return "waiting";
}

export function portraitLayers(profile: Profile): PortraitLayers {
  const metricsReady = Object.keys(profile.metrics).length > 0;
  const voiceReady = VOICE_HEADING.test(profile.styleMd);
  const rulesReady = RULES_HEADING.test(profile.styleMd);
  return {
    a: layerState(metricsReady, profile.status),
    b: layerState(voiceReady, profile.status),
    c: layerState(rulesReady, profile.status),
  };
}

export function railCounts(posts: Post[]): RailCounts {
  const counts: RailCounts = { all: posts.length, telegram: 0, x: 0, dzen: 0, vk: 0 };
  for (const post of posts) counts[post.platform] += 1;
  return counts;
}

export function recentPosts(posts: Post[], n: number): Post[] {
  return [...posts]
    .sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : left.updatedAt > right.updatedAt ? -1 : 0))
    .slice(0, n);
}

export function canCreatePost(platform: Platform, kind: PostKind): boolean {
  return !(platform === "x" && kind === "article");
}

export function kindForNewPost(platform: Platform, article: boolean): PostKind {
  if (article) return "article";
  return platformDef(platform).defaultKind;
}

export function afterCreateRoute(profile: Profile): Route {
  return { kind: "profile", profileId: profile.id, tab: "voice" };
}

const TEXTS_KEYS = ["texts", "posts"] as const;
const CHARS_KEYS = ["chars", "characters"] as const;
const SENTENCE_KEYS = ["sentenceLength", "sentence_length", "sentence_words_mean", "avgSentence"] as const;
const POSTLEN_KEYS = ["medianPostLength", "median_post_length", "text_chars_median", "postLengthMedian"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function lookupNumber(bag: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const parsed = asNumber(bag[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function metricBag(metrics: Record<string, unknown>): Record<string, unknown> {
  const bag: Record<string, unknown> = { ...metrics };
  if (isRecord(metrics.meta)) Object.assign(bag, metrics.meta);
  if (isRecord(metrics.geometry)) Object.assign(bag, metrics.geometry);
  return bag;
}

function formatDecimal(n: number, locale: ProfileLocale): string {
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return locale === "ru" ? text.replace(".", ",") : text;
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/gu, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function formatCorpusValue(texts: number, chars: number, locale: ProfileLocale): string {
  if (locale === "en") {
    const postsLabel = texts === 1 ? "post" : "posts";
    const charsPart = chars < 1000 ? `${chars} chars` : `${Math.round(chars / 1000)}k chars`;
    return `${texts} ${postsLabel} · ${charsPart}`;
  }
  const postsWord = ruPlural(texts, "пост", "поста", "постов");
  const charsPart =
    chars < 1000
      ? `${chars} ${ruPlural(chars, "знак", "знака", "знаков")}`
      : `${Math.round(chars / 1000)} тыс. знаков`;
  return `${texts} ${postsWord} · ${charsPart}`;
}

const LIST_MARKER = /^[-*]\s+|^\d+\.\s+/u;

export function rulesLines(styleMd: string): string[] {
  const lines = styleMd.split(/\r?\n/u);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^##\s/u.test(line) && RULES_HEADING.test(line)) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return [];

  const result: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^#{1,2}\s/u.test(line)) break;
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const stripped = trimmed.replace(LIST_MARKER, "");
    if (stripped !== "") {
      result.push(stripped);
      if (result.length >= 6) break;
    }
  }
  return result;
}

export function metricRows(metrics: Record<string, unknown>, locale: ProfileLocale): MetricRow[] {
  const dict = profileCopy[locale];
  const bag = metricBag(metrics);
  const rows: MetricRow[] = [];
  const texts = lookupNumber(bag, TEXTS_KEYS);
  const chars = lookupNumber(bag, CHARS_KEYS);
  if (texts !== null && chars !== null) {
    rows.push({
      label: dict.metricCorpus,
      value: formatCorpusValue(texts, chars, locale),
    });
  }
  const sentence = lookupNumber(bag, SENTENCE_KEYS);
  if (sentence !== null) {
    rows.push({
      label: dict.metricSentence,
      value: fill(dict.metricSentenceValue, { n: formatDecimal(sentence, locale) }),
    });
  }
  const postLen = lookupNumber(bag, POSTLEN_KEYS);
  if (postLen !== null) {
    rows.push({
      label: dict.metricPostLen,
      value: fill(dict.metricPostLenValue, { n: formatDecimal(postLen, locale) }),
    });
  }
  return rows;
}

const SOURCE_URL = /^(https?:\/\/|t\.me\/)/iu;

export function sourceLine(source: string, locale: ProfileLocale): string {
  const trimmed = source.trim();
  if (trimmed === "") return profileCopy[locale].sourceEmpty;
  if (SOURCE_URL.test(trimmed)) return trimmed;
  return profileCopy[locale].sourcePasted;
}

export function rememberProfileId(id: string): void {
  try {
    localStorage.setItem(LAST_PROFILE_KEY, id);
  } catch {
    // storage unavailable
  }
}

export function lastProfileId(profiles: Profile[]): string | null {
  if (profiles.length === 0) return null;
  try {
    const stored = localStorage.getItem(LAST_PROFILE_KEY);
    if (stored !== null && profiles.some((profile) => profile.id === stored)) return stored;
  } catch {
    // storage unavailable
  }
  return profiles[0]!.id;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter((part) => part.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}
