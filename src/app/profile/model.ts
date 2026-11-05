import type { Platform, Post, PostKind, Profile, ProfileStatus } from "../../shared/model";
import { platformDef } from "../../shared/platforms";

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
