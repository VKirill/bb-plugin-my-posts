import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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

function containerBlock(css: string, query: string): string {
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

describe("segmented tabs", () => {
  const app = readFileSync(join(root, "app.css"), "utf8");

  it("gives every segment the equal width the thumb formula assumes", () => {
    const seg = rule(app, ".mp-seg");
    expect(seg).toMatch(/display:\s*inline-grid/);
    expect(seg).toMatch(/grid-auto-flow:\s*column/);
    expect(seg).toMatch(/grid-auto-columns:\s*1fr/);
    expect(app).toMatch(/\.mp-seg-thumb[\s\S]*width:\s*calc\(\(100% - 6px\) \/ var\(--mp-seg-n, 1\)\)/u);
  });

  it("mixes foreground into the thumb so it reads on the well", () => {
    const thumb = rule(app, ".mp-seg-thumb");
    expect(thumb).toMatch(/color-mix\(in oklab,\s*var\(--foreground\)\s+14%,\s*var\(--mp-card\)\)/);
    expect(thumb).toMatch(/border:\s*1px\s+solid/);
    expect(thumb).not.toMatch(/background-color:\s*var\(--mp-card\)\s*;/);
  });
});

describe("profile header", () => {
  const profileCss = readFileSync(join(root, "src/app/profile/profile.css"), "utf8");
  const home = readFileSync(join(root, "src/app/profile/ProfileHome.tsx"), "utf8");
  const phone = containerBlock(profileCss, "@container mp (max-width: 720px)");

  it("labels the rebuild button and wraps its text for the phone hide", () => {
    expect(home).toContain('aria-label={t("rebuild")}');
    expect(home).toContain('className="mp-btn-label"');
    expect(home).toContain("{t(\"rebuild\")}");
  });

  it("hides the rebuild label and keeps the menu button on a phone", () => {
    expect(rule(phone, ".mp-head .mp-btn-label")).toMatch(/display:\s*none/);
    expect(rule(phone, ".mp-head")).toMatch(/height:\s*auto/);
    expect(rule(phone, ".mp-head")).toMatch(/min-height:\s*var\(--mp-crumb-h\)/);
    expect(rule(phone, ".mp-head .mp-seg")).toMatch(/min-width:\s*0/);
    expect(phone).toMatch(/\.mp-head \[aria-haspopup="menu"\][\s\S]*flex-shrink:\s*0/u);
  });
});
