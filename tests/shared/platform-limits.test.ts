import { describe, expect, it } from "vitest";
import { platformRules } from "../../src/shared/platforms";

describe("platform copywriter limits", () => {
  it("states only the Telegram character limit", () => {
    expect(platformRules("telegram")).toBe("The post is at most 4096 characters.");
  });

  it("states only the VK character limit", () => {
    expect(platformRules("vk")).toBe("The post is at most 16384 characters.");
  });

  it("keeps the X character limit", () => {
    expect(platformRules("x")).toContain("280");
  });
});
