import type { Platform } from "../../shared/model";
import { t } from "../i18n";

const PLATFORM_KEY: Record<Platform, "platformTelegram" | "platformX" | "platformDzen" | "platformVk"> = {
  telegram: "platformTelegram",
  x: "platformX",
  dzen: "platformDzen",
  vk: "platformVk",
};

export interface PostHeader {
  platform: Platform;
  label: string;
  showLabel: boolean;
}

/** X’s tile is the label; other platforms keep the word next to the icon. */
export function postHeader(platform: Platform): PostHeader {
  return {
    platform,
    label: t(PLATFORM_KEY[platform]),
    showLabel: platform !== "x",
  };
}
