import { describe, expect, it } from "vitest";
import { MP_CHANGED } from "../../src/shared/contract";

describe("events", () => {
  it("exports the realtime channel name", () => {
    expect(MP_CHANGED).toEqual("my-posts:changed");
  });
});
