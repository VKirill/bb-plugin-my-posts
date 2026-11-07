import type { Locale, Profile } from "../../shared/model";
import { ruPlural } from "../i18n";
import type { Route } from "../routes";

export function routeAfterProfileDelete(profiles: Profile[], deletedId: string): Route {
  const index = profiles.findIndex((profile) => profile.id === deletedId);
  const remaining = profiles.filter((profile) => profile.id !== deletedId);
  if (remaining.length === 0) return { kind: "home" };
  const after = index >= 0 ? profiles[index + 1] : undefined;
  if (after !== undefined) return { kind: "profile", profileId: after.id };
  return { kind: "profile", profileId: remaining[remaining.length - 1]!.id };
}

export function deleteProfileText(name: string, postCount: number, locale: Locale): string {
  if (locale === "ru") {
    return `Удалить профиль «${name}» и ${postCount} ${ruPlural(postCount, "пост", "поста", "постов")}? Это нельзя отменить.`;
  }
  const posts = postCount === 1 ? "post" : "posts";
  return `Delete profile “${name}” and ${postCount} ${posts}? This cannot be undone.`;
}

export function rebuildPrompt(locale: Locale): string {
  return locale === "ru"
    ? "Пересобери портрет стиля по исходным текстам профиля. Обнови измеримое, голос и правила генерации."
    : "Rebuild the style portrait from the profile source texts. Update the measured, voice and writing-rules layers.";
}
