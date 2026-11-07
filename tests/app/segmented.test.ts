import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COMPACT_AT, NARROW_AT } from "../../src/app/ui/breakpoints";
import { Tabs, Toggle } from "../../src/app/ui/Segmented";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const items = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
] as const;

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe("Tabs", () => {
  it("marks the value item as the only selected tab", () => {
    const html = renderToStaticMarkup(
      createElement(Tabs, { items: [...items], value: "b", onChange: () => {}, label: "Panes" }),
    );
    expect(html).toContain('role="tablist"');
    expect(count(html, 'role="tab"')).toBe(2);
    expect(count(html, 'aria-selected="true"')).toBe(1);
    expect(html).toMatch(/aria-selected="true"[^>]*data-state="active"|data-state="active"[^>]*aria-selected="true"/u);
    expect(html).toContain(">B</button>");
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(html).toMatch(/aria-selected="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-selected="true"/u);
    expect(count(html, 'tabindex="-1"')).toBe(1);
  });
});

describe("Toggle", () => {
  it("presses only the value item inside a group", () => {
    const html = renderToStaticMarkup(
      createElement(Toggle, { items: [...items], value: "a", onChange: () => {}, label: "Mode" }),
    );
    expect(html).toContain('role="group"');
    expect(count(html, 'aria-pressed="true"')).toBe(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>A</u);
  });
});

describe("unknown value", () => {
  it("renders no sliding thumb when the value matches no item", () => {
    const html = renderToStaticMarkup(
      createElement(Tabs, { items: [...items], value: "z", onChange: () => {}, label: "Panes" }),
    );
    expect(html).not.toContain("mp-seg-thumb");
  });
});

describe("tokens and motion", () => {
  const app = readFileSync(join(root, "app.css"), "utf8");
  const post = readFileSync(join(root, "src/app/post/post.css"), "utf8");
  const profile = readFileSync(join(root, "src/app/profile/profile.css"), "utf8");
  const css = `${app}\n${post}\n${profile}`;

  it("highlights selected and pressed items, slides the thumb, and reduces motion", () => {
    expect(app).toMatch(/\[aria-selected="true"\]/);
    expect(app).toMatch(/\[aria-pressed="true"\]/);
    expect(app).toMatch(/\.mp-seg-thumb[\s\S]*transition:[^;]*transform/u);
    expect(app).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*transition:\s*none/u);
    expect(app).toMatch(/\.mp-nav-item[\s\S]*transition:/u);
  });

  it("uses compact/narrow breakpoints and declares spacing tokens once", () => {
    const allowed = new Set([COMPACT_AT - 1, NARROW_AT]);
    const queries = [...`${post}\n${profile}`.matchAll(/@container[^{]*\(max-width:\s*(\d+)px\)/gu)];
    expect(queries.length).toBeGreaterThan(0);
    for (const match of queries) {
      expect(allowed.has(Number(match[1]))).toBe(true);
    }
    expect(count(css, "--mp-s1:")).toBe(1);
    expect(count(css, "--mp-gap:")).toBe(1);
    expect(count(css, "--mp-pad-card:")).toBe(1);
    expect(count(css, "--mp-chat-w:")).toBe(1);
  });
});
