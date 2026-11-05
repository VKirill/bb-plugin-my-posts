import { describe, expect, it } from "vitest";
import { mpSessionPolicy } from "../../src/server/session-policy";

describe("mpSessionPolicy skill names", () => {
  it("uses bare style-portrait for profile sessions", () => {
    expect(mpSessionPolicy("profile").skills).toEqual({
      mode: "allow",
      names: ["style-portrait"],
    });
  });

  it("uses bare writing-in-style and style-portrait for post sessions", () => {
    expect(mpSessionPolicy("post").skills).toEqual({
      mode: "allow",
      names: ["writing-in-style", "style-portrait"],
    });
  });
});
