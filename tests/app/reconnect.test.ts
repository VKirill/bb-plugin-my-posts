import { describe, expect, it } from "vitest";
import { isReconnect } from "../../src/app/data";

describe("isReconnect", () => {
  it("is true for reconnecting → connected", () => {
    expect(isReconnect("reconnecting", "connected")).toBe(true);
  });

  it("is false for connected → connected", () => {
    expect(isReconnect("connected", "connected")).toBe(false);
  });
});
