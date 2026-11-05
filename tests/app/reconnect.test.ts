import { describe, expect, it } from "vitest";
import { isReconnect } from "../../src/app/data";

describe("isReconnect", () => {
  it("is true only for reconnecting → connected", () => {
    expect(isReconnect("reconnecting", "connected")).toBe(true);
  });

  it("is false for connecting → connected", () => {
    expect(isReconnect("connecting", "connected")).toBe(false);
  });

  it("is false for null → connected", () => {
    expect(isReconnect(null, "connected")).toBe(false);
  });

  it("is false for connected → connected", () => {
    expect(isReconnect("connected", "connected")).toBe(false);
  });

  it("is false for connected → reconnecting", () => {
    expect(isReconnect("connected", "reconnecting")).toBe(false);
  });

  it("is false for reconnecting → reconnecting", () => {
    expect(isReconnect("reconnecting", "reconnecting")).toBe(false);
  });

  it("is false for any transition to a non-connected state", () => {
    expect(isReconnect("connected", "connecting")).toBe(false);
    expect(isReconnect("reconnecting", "connecting")).toBe(false);
    expect(isReconnect("connecting", "reconnecting")).toBe(false);
  });
});
