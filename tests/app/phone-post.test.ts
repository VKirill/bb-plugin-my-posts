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

function ruleContaining(css: string, fragment: string): string {
  const idx = css.indexOf(fragment);
  expect(idx).toBeGreaterThan(-1);
  const open = css.indexOf("{", idx);
  const close = css.indexOf("}", open);
  expect(close).toBeGreaterThan(open);
  const selector = css.slice(0, open);
  const from = selector.lastIndexOf("}");
  return `${selector.slice(from + 1)}\n${css.slice(open + 1, close)}`;
}

describe("phone post page", () => {
  const css = readFileSync(join(root, "src/app/post/post.css"), "utf8");
  const page = readFileSync(join(root, "src/app/post/PostPage.tsx"), "utf8");
  const phone = containerBlock(css, "@container mp-post (max-width: 720px)");

  it("gives bar, crumbs, segments, editor tools, footer and selection buttons a 40px tap target", () => {
    const heightRule = ruleContaining(phone, ".mp-post-bar .mp-btn");
    for (const selector of [
      ".mp-post-bar .mp-btn",
      ".mp-post-crumb-btn",
      ".mp-seg-sm .mp-seg-item",
      ".mp-post-edtools button",
      ".mp-post-foot button",
      ".mp-post-sel button",
    ]) {
      expect(heightRule).toContain(selector);
    }
    expect(heightRule).toMatch(/min-height:\s*40px/);

    const widthRule = ruleContaining(phone, ".mp-post-bar .mp-btn.icon");
    expect(widthRule).toMatch(/min-width:\s*40px/);
    expect(widthRule).toContain(".mp-post-bar .mp-btn.icon");
    expect(widthRule).toContain(".mp-post-edtools button");
  });

  it("shows the crumb profile name with ellipsis instead of hiding it", () => {
    const name = rule(phone, ".mp-post-crumb-name");
    expect(name).not.toMatch(/display:\s*none/);
    expect(name).toMatch(/max-width:/);
    expect(name).toMatch(/overflow:\s*hidden/);
    expect(name).toMatch(/text-overflow:\s*ellipsis/);
    const hidden = ruleContaining(phone, ".mp-post-copy-lbl");
    expect(hidden).not.toMatch(/\.mp-post-crumb-name/);
  });

  it("pads the editor scroll and footer for the iOS home bar", () => {
    const inner = rule(phone, ".mp-post-page-inner");
    expect(inner).toMatch(/padding-bottom:\s*calc\(56px\s*\+\s*var\(--mp-s3\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
    const foot = rule(phone, ".mp-post-foot");
    expect(foot).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom\)/);
  });

  it("passes the rendered selection toolbar size to toolbarPosition", () => {
    expect(page).not.toMatch(/toolbarPosition\([\s\S]*\{\s*width:\s*320,\s*height:\s*36\s*\}/);
    expect(page).toMatch(/offsetWidth/);
    expect(page).toMatch(/offsetHeight/);
    expect(page).toMatch(/toolbarPosition\([^)]*measuredToolbarSize\(\)/);
  });

  it("keeps badge, status and the editor/preview toggle on one row", () => {
    const meta = rule(phone, ".mp-post-meta");
    expect(meta).toMatch(/flex-wrap:\s*nowrap/);
    const status = rule(phone, ".mp-post-meta .mp-pill");
    expect(status).toMatch(/min-width:\s*0/);
    expect(status).toMatch(/overflow:\s*hidden/);
    expect(status).toMatch(/text-overflow:\s*ellipsis/);
    const toggle = rule(phone, ".mp-post-meta .mp-seg");
    expect(toggle).toMatch(/flex-shrink:\s*0/);
  });

  it("aligns the posts menu to the right edge of its button", () => {
    const pop = rule(css, ".mp-post-posts-pop");
    expect(pop).toMatch(/right:\s*0/);
    expect(pop).toMatch(/left:\s*auto/);
    expect(pop).toMatch(/max-width:\s*min\(340px,\s*calc\(100vw - 32px\)\)/);
  });
});
