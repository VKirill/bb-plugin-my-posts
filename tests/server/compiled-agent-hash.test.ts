import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { compiledMainAgent } from "../../src/server/compiled-agent";
import type { SessionKind } from "../../src/server/kinds";

const PROFILE_HASH = "be4749fa0b2cea5cb5d39e13e9a34123083f1a1e9aee3c5cf218f1908f0f3c88";
const POST_HASH = "d66c999ca422e0faff851af79e62d47a90ab8480b6a8c36624e60a09db4617fc";

function canonicalSourceHash(profile: Record<string, unknown>): string {
  const { sourceHash: _dropped, ...body } = profile;
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, canonical(nested)]),
      );
    }
    return value;
  };
  return createHash("sha256").update(JSON.stringify(canonical(body))).digest("hex");
}

describe("compiledMainAgent sourceHash", () => {
  it("matches the hub digest for the profile and post agents", () => {
    expect(compiledMainAgent("profile").sourceHash).toBe(PROFILE_HASH);
    expect(compiledMainAgent("post").sourceHash).toBe(POST_HASH);
  });

  it("is the sha256 of the canonical JSON of the profile without sourceHash", () => {
    const kinds: SessionKind[] = ["profile", "post"];
    for (const kind of kinds) {
      const agent = compiledMainAgent(kind);
      expect(agent.sourceHash).toBe(canonicalSourceHash({ ...agent }));
    }
  });
});
