import { useSyncExternalStore } from "react";
import { core } from "./core";
import { post } from "./post";
import { profile } from "./profile";

const en = { ...core.en, ...profile.en, ...post.en };

export type MessageKey = keyof typeof en;

const ru: Record<MessageKey, string> = { ...core.ru, ...profile.ru, ...post.ru };

export const DICTIONARIES = { en, ru } as const;
export type Locale = keyof typeof DICTIONARIES;

/** The Russifier plugin translates BB's English UI in place and leaves <html lang> as
 * "en"; its work shows on BB's own chrome as Cyrillic accessible names. */
function russifierActive(): boolean {
  try {
    if (globalThis.localStorage?.getItem("bb-plugin-ru:enabled") === "off") return false;
  } catch {
    // storage unavailable
  }
  const labels = document.querySelectorAll('[data-sidebar="sidebar"] button[aria-label], header button[aria-label]');
  for (const button of Array.from(labels).slice(0, 12)) {
    if (/[А-Яа-яЁё]/u.test(button.getAttribute("aria-label") ?? "")) return true;
  }
  return false;
}

/** BB's interface language: <html lang>, then the Pokecut theme's resolved
 * `data-pk-lang` (it honours the user's override), then the Russifier. */
export function detectLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const root = document.documentElement;
  if (root.lang.toLowerCase().startsWith("ru")) return "ru";
  const pokecut = root.getAttribute("data-pk-lang");
  if (pokecut === "ru" || pokecut === "en") return pokecut;
  return russifierActive() ? "ru" : "en";
}

function format(template: string, vars?: Record<string, string | number>): string {
  if (vars === undefined) return template;
  return template.replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

function subscribeLang(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined" || typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "data-pk-lang"] });
  const sidebar = document.querySelector('[data-sidebar="sidebar"]');
  if (sidebar !== null) observer.observe(sidebar, { subtree: true, attributes: true, attributeFilter: ["aria-label"] });
  const timers = [500, 2000, 5000].map((ms) => setTimeout(onChange, ms));
  return () => {
    observer.disconnect();
    for (const timer of timers) clearTimeout(timer);
  };
}

/** Re-render when BB switches `<html lang>` (it can change after the bundle loads). Call it in
 * every root component; children read the locale through t() on that render. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLang, detectLocale, () => "en" as Locale);
}

/** Translate a known key. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return format(DICTIONARIES[detectLocale()][key], vars);
}
