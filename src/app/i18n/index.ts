import { useSyncExternalStore } from "react";
import type { Language, Locale, Platform } from "../../shared/model";
import { core } from "./core";
import { post } from "./post";
import { profile } from "./profile";
import { platformCopy } from "./platforms";

export type { Locale };

const en = { ...core.en, ...profile.en, ...post.en };

export type MessageKey = keyof typeof en;

const ru: Record<MessageKey, string> = { ...core.ru, ...profile.ru, ...post.ru };

export const DICTIONARIES = { en, ru } as const;

let languagePreference: Language = "auto";
const preferenceListeners = new Set<() => void>();

export function resolveLocale(language: Language, detected: Locale): Locale {
  return language === "auto" ? detected : language;
}

export function setLanguagePreference(language: Language): void {
  languagePreference = language;
  for (const listener of preferenceListeners) listener();
}

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

function detectBbLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const root = document.documentElement;
  if (root.lang.toLowerCase().startsWith("ru")) return "ru";
  const pokecut = root.getAttribute("data-pk-lang");
  if (pokecut === "ru" || pokecut === "en") return pokecut;
  return russifierActive() ? "ru" : "en";
}

/** BB's interface language: <html lang>, then the Pokecut theme's resolved
 * `data-pk-lang` (it honours the user's override), then the Russifier — unless
 * the owner picked a language in Settings. */
export function detectLocale(): Locale {
  return resolveLocale(languagePreference, detectBbLocale());
}

export const fill = (template: string, vars?: Record<string, string | number>): string => {
  if (vars === undefined) return template;
  return template.replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
};

export const ruPlural = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

export const formatDecimal = (n: number, locale: Locale): string => {
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return locale === "ru" ? text.replace(".", ",") : text;
};

function subscribeLang(onChange: () => void): () => void {
  preferenceListeners.add(onChange);
  if (typeof MutationObserver === "undefined" || typeof document === "undefined") {
    return () => {
      preferenceListeners.delete(onChange);
    };
  }
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "data-pk-lang"] });
  const sidebar = document.querySelector('[data-sidebar="sidebar"]');
  if (sidebar !== null) observer.observe(sidebar, { subtree: true, attributes: true, attributeFilter: ["aria-label"] });
  const timers = [500, 2000, 5000].map((ms) => setTimeout(onChange, ms));
  return () => {
    preferenceListeners.delete(onChange);
    observer.disconnect();
    for (const timer of timers) clearTimeout(timer);
  };
}

/** Re-render when BB switches `<html lang>` or the owner changes the plugin language. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLang, detectLocale, () => "en" as Locale);
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return fill(DICTIONARIES[detectLocale()][key], vars);
}

export function platformLabel(id: Platform): string {
  return platformCopy[detectLocale()][id].label;
}

export function platformHint(id: Platform): string {
  return platformCopy[detectLocale()][id].hint;
}

export function platformRulesLine(id: Platform): string {
  return platformCopy[detectLocale()][id].rules;
}
