import { useCallback } from "react";
import { useBbNavigate } from "@get-bb/plugin-sdk/app";
import { PLATFORMS_IDS, type Platform } from "../shared/model";

export const PANEL_PATH = "my-posts";

export type { Platform };

export type ProfileTab = "overview" | "voice";

export type Route =
  | { kind: "home" }
  | { kind: "create-profile" }
  | { kind: "settings" }
  | { kind: "profile"; profileId: string; tab?: ProfileTab; platform?: Platform }
  | { kind: "post"; postId: string };

const PLATFORM_IDS: ReadonlySet<string> = new Set(PLATFORMS_IDS);
const TABS = new Set<string>(["overview", "voice"]);

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function isPlatform(value: string): value is Platform {
  return PLATFORM_IDS.has(value);
}

function isTab(value: string): value is ProfileTab {
  return TABS.has(value);
}

export function parseRoute(subPath: string): Route {
  const parts = subPath.split("/").filter((part) => part !== "").map(decode);
  if (parts.length === 0) return { kind: "home" };
  if (parts[0] === "create") return { kind: "create-profile" };
  if (parts[0] === "settings") return { kind: "settings" };
  if (parts[0] === "post" && parts[1] !== undefined) return { kind: "post", postId: parts[1] };
  if (parts[0] === "p" && parts[1] !== undefined) {
    const profileId = parts[1];
    const second = parts[2];
    const third = parts[3];
    if (second === undefined) return { kind: "profile", profileId };
    if (isTab(second) && third === undefined) return { kind: "profile", profileId, tab: second };
    if (isTab(second) && third !== undefined && isPlatform(third)) {
      return { kind: "profile", profileId, tab: second, platform: third };
    }
    if (isPlatform(second) && third === undefined) return { kind: "profile", profileId, platform: second };
    return { kind: "profile", profileId };
  }
  return { kind: "home" };
}

/** Unencoded subPath for useBbNavigate().toPluginPanel (BB encodes segments). */
export function routePath(route: Route): string {
  switch (route.kind) {
    case "home":
      return "";
    case "create-profile":
      return "create";
    case "settings":
      return "settings";
    case "post":
      return `post/${route.postId}`;
    case "profile": {
      const segments = [`p/${route.profileId}`];
      if (route.tab !== undefined) segments.push(route.tab);
      if (route.platform !== undefined) segments.push(route.platform);
      return segments.join("/");
    }
  }
}

export function useGo() {
  const navigate = useBbNavigate();
  return useCallback(
    (route: Route, options?: { replace?: boolean }) =>
      navigate.toPluginPanel(PANEL_PATH, {
        subPath: routePath(route),
        ...(options?.replace === true ? { replace: true } : {}),
      }),
    [navigate],
  );
}
