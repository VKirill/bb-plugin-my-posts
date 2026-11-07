import { describe, expect, it } from "vitest";
import { fromPickerValue, toPickerValue } from "../../src/app/settings/model-value";
import type { Settings } from "../../src/shared/model";

const settings: Settings = {
  providerId: "claude-code",
  model: "claude-opus-5-5",
  projectId: null,
  language: "auto",
};

describe("toPickerValue", () => {
  it("maps stored provider and model onto the picker value", () => {
    expect(toPickerValue(settings)).toEqual({
      providerId: "claude-code",
      model: "claude-opus-5-5",
      reasoningLevel: "medium",
    });
  });
});

describe("fromPickerValue", () => {
  it("returns the settings_set patch from a picker change", () => {
    expect(
      fromPickerValue(settings, { providerId: "codex", model: "gpt-x", reasoningLevel: "high" }),
    ).toEqual({ providerId: "codex", model: "gpt-x" });
  });
});
