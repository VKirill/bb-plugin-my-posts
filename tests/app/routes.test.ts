import { describe, expect, it } from "vitest";
import { parseRoute, routePath, type Route } from "../../src/app/routes";

describe("routes", () => {
  it("round-trips home, create-profile, profile (tab and platform) and post", () => {
    const routes: Route[] = [
      { kind: "home" },
      { kind: "create-profile" },
      { kind: "profile", profileId: "voice-1" },
      { kind: "profile", profileId: "voice-1", tab: "overview" },
      { kind: "profile", profileId: "voice-1", tab: "voice" },
      { kind: "profile", profileId: "voice-1", platform: "telegram" },
      { kind: "profile", profileId: "voice-1", tab: "overview", platform: "x" },
      { kind: "profile", profileId: "voice-1", tab: "voice", platform: "dzen" },
      { kind: "profile", profileId: "voice-1", platform: "vk" },
      { kind: "post", postId: "post-9" },
    ];
    for (const route of routes) expect(parseRoute(routePath(route))).toEqual(route);
  });
});
