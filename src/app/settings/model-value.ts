import type { Settings } from "../../shared/model";

/** Picker value the SDK component requires; reasoning is not stored in settings. */
export type PickerValue = {
  providerId: string;
  model: string;
  reasoningLevel: string;
};

export function toPickerValue(settings: Settings): PickerValue {
  return {
    providerId: settings.providerId,
    model: settings.model,
    reasoningLevel: "medium",
  };
}

export function fromPickerValue(
  settings: Settings,
  value: { providerId: string; model: string; reasoningLevel: string },
): { providerId: string; model: string } {
  void settings;
  return { providerId: value.providerId, model: value.model };
}
