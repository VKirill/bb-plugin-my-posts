import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DICTIONARIES, resolveLocale, setLanguagePreference, t } from "../../src/app/i18n";
import { parseRoute, routePath } from "../../src/app/routes";
import { SettingsPage } from "../../src/app/settings/SettingsPage";

vi.mock("../../src/app/data", () => ({
  useMpRpc: () => ({ call: vi.fn(() => Promise.resolve()) }),
  useSettings: () => ({
    data: { providerId: "claude-code", model: "claude-opus-5-5", projectId: null, language: "auto" },
    error: null,
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@get-bb/plugin-sdk/app", () => ({
  experimental_ProviderModelPicker: () => createElement("div", { "data-picker": "model" }),
}));

afterEach(() => {
  setLanguagePreference("auto");
});

describe("resolveLocale", () => {
  it("overrides BB detection unless the preference is auto", () => {
    expect(resolveLocale("ru", "en")).toEqual("ru");
    expect(resolveLocale("en", "ru")).toEqual("en");
    expect(resolveLocale("auto", "ru")).toEqual("ru");
  });
});

describe("setLanguagePreference", () => {
  it("switches t() to the English then Russian dictionary", () => {
    setLanguagePreference("en");
    expect(t("settings")).toEqual(DICTIONARIES.en.settings);
    setLanguagePreference("ru");
    expect(t("settings")).toEqual(DICTIONARIES.ru.settings);
  });
});

describe("settings route", () => {
  it("parses and prints the settings path", () => {
    expect(parseRoute("settings")).toEqual({ kind: "settings" });
    expect(routePath({ kind: "settings" })).toEqual("settings");
  });
});

describe("SettingsPage", () => {
  it("renders the language group and the agent model label", () => {
    setLanguagePreference("ru");
    const html = renderToStaticMarkup(createElement(SettingsPage));
    expect(html).toContain('role="group"');
    expect(html).toContain("Авто");
    expect(html).toContain("Русский");
    expect(html).toContain("English");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain(DICTIONARIES.ru.agentModel);
  });
});
