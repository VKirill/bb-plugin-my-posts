import { t } from "../i18n";
import type { Platform, Post, Proposal } from "../../shared/model";
import { COMPACT_AT } from "../ui/breakpoints";

export const CHAT_WIDTH_KEY = "my-posts.chatWidth";
export const DIVIDER_PX = 9;
export const MIN_CHAT = 320;
export const MAX_CHAT = 640;
export const MIN_POST = 480;
export const DEFAULT_CHAT = 400;
export const DEFAULT_CHAT_NARROW = 380;
export const TABS_AT = 900;
export const COMPACT_CHAT_AT = COMPACT_AT;
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

export interface ViewportBox {
  width: number;
  height: number;
  left?: number;
  top?: number;
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
const MIRROR_STYLES = [
  "boxSizing",
  "width",
  "font",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textIndent",
  "textTransform",
  "wordSpacing",
  "tabSize",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "border",
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "whiteSpace",
  "wordWrap",
  "overflowWrap",
] as const;

/** Caret / line box at `index` in a textarea (mirror-div measurement). */
export function selectionLineRect(textarea: HTMLTextAreaElement, index = textarea.selectionStart): DOMRect {
  const taRect = textarea.getBoundingClientRect();
  const style = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const cs = mirror.style;
  cs.position = "fixed";
  cs.left = `${taRect.left}px`;
  cs.top = `${taRect.top - textarea.scrollTop}px`;
  cs.visibility = "hidden";
  cs.pointerEvents = "none";
  cs.overflow = "hidden";
  cs.whiteSpace = "pre-wrap";
  cs.wordWrap = "break-word";
  cs.overflowWrap = "break-word";
  for (const prop of MIRROR_STYLES) {
    cs[prop] = style[prop];
  }
  cs.width = `${textarea.clientWidth}px`;
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.append(textarea.value.slice(0, index), marker);
  document.body.append(mirror);
  const mark = marker.getBoundingClientRect();
  const lineHeight = mark.height || Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) || 20;
  mirror.remove();
  return new DOMRect(mark.left, mark.top, Math.max(mark.width, 1), lineHeight);
}

/** Place the selection toolbar near the selection, clamped inside the editor card (and the viewport when given). */
export function toolbarPosition(
  anchorRect: BoxRect,
  columnRect: BoxRect,
  toolbarSize: Size,
  viewport?: ViewportBox,
): { left: number; top: number } {
  let left = anchorRect.left + anchorRect.width / 2 - toolbarSize.width / 2;
  let top = anchorRect.top - toolbarSize.height - TOOLBAR_GAP;
  if (viewport === undefined) {
    const maxLeft = columnRect.right - toolbarSize.width;
    const minLeft = columnRect.left;
    left = maxLeft < minLeft ? minLeft : Math.min(Math.max(left, minLeft), maxLeft);
    if (top < columnRect.top) top = anchorRect.bottom + TOOLBAR_GAP;
    const maxTop = columnRect.bottom - toolbarSize.height;
    const minTop = columnRect.top;
    top = maxTop < minTop ? minTop : Math.min(Math.max(top, minTop), maxTop);
    return { left, top };
  }
  const inset = TOOLBAR_GAP;
  const minLeft = columnRect.left + inset;
  const maxLeft = columnRect.right - inset - toolbarSize.width;
  left = maxLeft < minLeft ? minLeft : Math.min(Math.max(left, minLeft), maxLeft);
  const viewTop = viewport.top ?? 0;
  const viewBottom = viewTop + viewport.height;
  const minTop = viewTop + inset;
  const maxTop = viewBottom - toolbarSize.height - inset;
  if (top < minTop) {
    const below = anchorRect.bottom + TOOLBAR_GAP;
    top = below + toolbarSize.height <= viewBottom - inset ? below : minTop;
  }
  if (maxTop < minTop) top = minTop;
  else if (top > maxTop) top = maxTop;
  else if (top < minTop) top = minTop;
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
