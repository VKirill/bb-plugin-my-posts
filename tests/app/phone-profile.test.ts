import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { profile } from "../../src/app/i18n/profile";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function rule(css: string, selector: string): string {
  const needle = `${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  expect(close).toBeGreaterThan(open);
  return css.slice(open + 1, close);
}

function block(css: string, query: string): string {
  const start = css.indexOf(query);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unclosed ${query}`);
}

describe("profile ⋯ menu", () => {
  const home = readFileSync(join(root, "src/app/profile/ProfileHome.tsx"), "utf8");
  const css = readFileSync(join(root, "src/app/profile/profile.css"), "utf8");

  it("anchors mp-menu to the button's right edge at 200px", () => {
    expect(home).toContain('className="mp-menu"');
    expect(home).not.toContain('className="mp-switcher"');
    const menu = rule(css, ".mp-menu");
    expect(menu).toMatch(/right:\s*0/);
    expect(menu).toMatch(/left:\s*auto/);
    expect(menu).toMatch(/min-width:\s*200px/);
    expect(menu).toMatch(/max-width:\s*calc\(100vw - 24px\)/);
  });
});

describe("phone tap targets and switcher width", () => {
  const css = readFileSync(join(root, "src/app/profile/profile.css"), "utf8");
  const phone = block(css, "@container mp (max-width: 720px)");

  it("raises buttons, tabs, inputs and nav rows to 40px", () => {
    expect(phone).toMatch(
      /\.mp-btn,\s*\.mp-seg-item,\s*\.mp-input,\s*\.mp-nav-item\s*\{[^}]*min-height:\s*40px/u,
    );
  });

  it("makes the switcher popover at least as wide as .mp-switch", () => {
    const switcher = rule(phone, ".mp-switcher");
    expect(switcher).toMatch(/left:\s*0/);
    expect(switcher).toMatch(/right:\s*0/);
    expect(switcher).toMatch(/width:\s*auto/);
    expect(switcher).not.toMatch(/left:\s*var\(--mp-s2\)/);
  });
});

describe("safe-area dialogs and rail footer", () => {
  const app = readFileSync(join(root, "app.css"), "utf8");
  const phone = block(app, "@media (max-width: 720px)");

  it("pads portal footers and rail for the iOS home bar", () => {
    expect(rule(phone, ".mp-portal")).toMatch(
      /padding-bottom:\s*calc\(var\(--mp-pad-card\) \+ env\(safe-area-inset-bottom/,
    );
    expect(rule(phone, ".mp-portal .mp-btn")).toMatch(/min-height:\s*40px/);
    expect(rule(phone, ".mp-portal .flex-col-reverse")).toMatch(/gap:\s*12px/);
    expect(rule(phone, ".mp-rail-footer")).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom/);
  });
});

describe("new post dialog cancel", () => {
  const src = readFileSync(join(root, "src/app/profile/NewPostDialog.tsx"), "utf8");

  it("renders a dictionary cancel button that closes the dialog", () => {
    expect(src).toContain('{t("cancel")}');
    expect(src).toContain("onOpenChange(false)");
    expect(src).toMatch(/className="mp-btn mp-ghost"[\s\S]*onClick=\{\(\) => onOpenChange\(false\)\}/u);
  });
});

describe("empty platform filter", () => {
  const rail = readFileSync(join(root, "src/app/profile/Rail.tsx"), "utf8");

  it("shows the empty-platform copy when a filter has no posts", () => {
    expect(rail).toContain('t("emptyPlatformPosts")');
    expect(profile.en.emptyPlatformPosts).toBe("No posts on this platform yet");
    expect(profile.ru.emptyPlatformPosts).toBe("На этой площадке постов пока нет");
  });
});

describe("style chat wrap", () => {
  const css = readFileSync(join(root, "src/app/profile/profile.css"), "utf8");

  it("wraps long code in the style chat", () => {
    expect(css).toMatch(/\.mp-chat-wrap code,\s*\.mp-chat-wrap pre\s*\{[^}]*overflow-wrap:\s*anywhere/u);
  });
});
