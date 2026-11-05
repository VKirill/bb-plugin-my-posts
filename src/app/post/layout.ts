import { t } from "../i18n";
import type { Platform, Post, Proposal } from "../../shared/model";

export const CHAT_WIDTH_KEY = "my-posts.chatWidth";
export const DIVIDER_PX = 9;
export const MIN_CHAT = 320;
export const MAX_CHAT = 640;
export const MIN_POST = 480;
export const DEFAULT_CHAT = 400;
export const DEFAULT_CHAT_NARROW = 380;
export const TABS_AT = 900;
export const COMPACT_CHAT_AT = 1280;
export const DIVIDER_STEP = 16;

export type SplitMode = "split" | "tabs";
export type SelectionAction = "shorter" | "sharper" | "voice";

export interface BoxRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export function defaultChatWidth(paneWidth: number): number {
  return paneWidth < COMPACT_CHAT_AT ? DEFAULT_CHAT_NARROW : DEFAULT_CHAT;
}

/** Keep the chat between 320 and 640px and the post column at 480px or more. */
export function clampChatWidth(paneWidth: number, requested: number): number {
  const leftover = paneWidth - DIVIDER_PX - MIN_POST;
  const maxChat = Math.min(MAX_CHAT, leftover);
  const lo = Math.min(MIN_CHAT, Math.max(0, maxChat));
  const hi = Math.max(lo, maxChat);
  return Math.min(hi, Math.max(lo, requested));
}

export function splitMode(width: number): SplitMode {
  return width <= TABS_AT ? "tabs" : "split";
}

const TOOLBAR_GAP = 8;

/** Place the selection toolbar near the selection, clamped inside the editor card. */
export function toolbarPosition(selectionRect: BoxRect, cardRect: BoxRect, toolbarSize: Size): { left: number; top: number } {
  let left = selectionRect.left + selectionRect.width / 2 - toolbarSize.width / 2;
  let top = selectionRect.top - toolbarSize.height - TOOLBAR_GAP;
  const maxLeft = cardRect.right - toolbarSize.width;
  const minLeft = cardRect.left;
  left = maxLeft < minLeft ? minLeft : Math.min(Math.max(left, minLeft), maxLeft);
  if (top < cardRect.top) top = selectionRect.bottom + TOOLBAR_GAP;
  const maxTop = cardRect.bottom - toolbarSize.height;
  const minTop = cardRect.top;
  top = maxTop < minTop ? minTop : Math.min(Math.max(top, minTop), maxTop);
  return { left, top };
}

export function chatBadge(post: Pick<Post, "tweets">, proposals: readonly Pick<Proposal, "status">[]): number {
  const pending = proposals.filter((row) => row.status === "pending").length;
  const stale = post.tweets.filter((tweet) => tweet.ruStale).length;
  return pending + stale;
}

const PROMPT_KEY: Record<SelectionAction, "promptShorter" | "promptSharper" | "promptVoice"> = {
  shorter: "promptShorter",
  sharper: "promptSharper",
  voice: "promptVoice",
};

export function selectionPrompt(action: SelectionAction, selection: string, _platform?: Platform): string {
  return t(PROMPT_KEY[action], { selection });
}

export function readStoredChatWidth(): number | null {
  try {
    const raw = globalThis.localStorage?.getItem(CHAT_WIDTH_KEY);
    if (raw === null || raw === undefined) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredChatWidth(width: number): void {
  try {
    globalThis.localStorage?.setItem(CHAT_WIDTH_KEY, String(width));
  } catch {
    // storage unavailable
  }
}
