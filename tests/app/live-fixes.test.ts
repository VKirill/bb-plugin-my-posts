import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLanguagePreference } from "../../src/app/i18n";
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SIZE_PROPS = new Set(["width", "height", "max-width", "max-height"]);
const POPOVER_BOXES = new Set([".mp-post-posts-pop", ".mp-switcher"]);

function cssRules(css: string): { selector: string; body: string }[] {
  const rules: { selector: string; body: string }[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    const selector = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, "").trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    const body = css.slice(open + 1, j - 1);
    if (selector.startsWith("@")) rules.push(...cssRules(body));
    else rules.push({ selector, body });
    i = j;
  }
  return rules;
}

function boxToken(selector: string): string | undefined {
  const parts = selector.trim().split(/\s+/u);
  return parts.at(-1);
}

function sizeDecls(body: string): { prop: string; value: string }[] {
  const direct = body.replace(/[^{}]*\{[^{}]*\}/g, "");
  return [...direct.matchAll(/([a-z-]+)\s*:\s*([^;]+);/giu)].flatMap((match) => {
    const prop = match[1]?.toLowerCase();
    const value = match[2]?.trim();
    if (prop === undefined || value === undefined || !SIZE_PROPS.has(prop)) return [];
    return [{ prop, value }];
  });
}

describe("popover boxes inside .mp-popover-wrap", () => {
  it("sizes the post list, profile head and switcher menus without percentage width or height", () => {
    const css = [
      readFileSync(path.join(root, "src/app/post/post.css"), "utf8"),
      readFileSync(path.join(root, "src/app/profile/profile.css"), "utf8"),
    ].join("\n");
    const boxes = cssRules(css).filter((rule) => {
      const token = boxToken(rule.selector);
      return token !== undefined && POPOVER_BOXES.has(token);
    });
    expect(boxes.map((rule) => boxToken(rule.selector)).sort()).toEqual([
      ".mp-post-posts-pop",
      ".mp-switcher",
      ".mp-switcher",
    ]);
    const percent = boxes.flatMap((rule) =>
      sizeDecls(rule.body)
        .filter((decl) => decl.value.includes("%"))
        .map((decl) => `${boxToken(rule.selector)} ${decl.prop}: ${decl.value}`),
    );
    expect(percent).toEqual([]);

    const postPop = boxes.find((rule) => boxToken(rule.selector) === ".mp-post-posts-pop");
    const decls = Object.fromEntries(sizeDecls(postPop?.body ?? "").map((decl) => [decl.prop, decl.value]));
    expect(decls.width).toEqual("340px");
    expect(decls["max-width"]).toEqual("min(340px, calc(100vw - 32px))");
    expect(decls["max-height"]).toEqual("min(70vh, 480px)");
  });
});

describe("SettingsPage", () => {
  it("puts a Назад button before the Настройки heading", () => {
    setLanguagePreference("ru");
    const html = renderToStaticMarkup(createElement(SettingsPage));
    expect(html).toContain(">Назад<");
    expect(html).toContain("Настройки");
    expect(html.indexOf(">Назад<") < html.indexOf("Настройки")).toEqual(true);
  });
});
