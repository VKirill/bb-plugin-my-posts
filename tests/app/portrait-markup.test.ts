import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PortraitCard } from "../../src/app/profile/PortraitCard";
import type { Profile } from "../../src/shared/model";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function markupProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: "prf_rules",
    name: "Test",
    source: "",
    status: "ready",
    styleMd: "## Правила генерации\n- **Крючок:** коротко\n- мат через *\n",
    metrics: { texts: 1, chars: 100 },
    traits: ["*курсив*"],
    styleThreadId: "thr_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("PortraitCard inline markup", () => {
  it("renders bold, italic, and a lone asterisk as text", () => {
    const html = renderToStaticMarkup(createElement(PortraitCard, { profile: markupProfile() }));
    expect(html).toContain("<strong>Крючок:</strong>");
    expect(html).not.toContain("**");
    expect(html).toContain("<em>курсив</em>");
    expect(html).toContain("мат через *");
    expect(html).toContain('class="mp-meta"');
  });
});

describe("portrait.css layer body text", () => {
  it("raises contrast of .mp-layer .mp-meta via color-mix of foreground", () => {
    const css = readFileSync(path.join(root, "src/app/profile/portrait.css"), "utf8");
    expect(css).toMatch(/\.mp-layer\s+\.mp-meta\s*\{[^}]*color-mix\([^)]*var\(--foreground\)\s*(8[5-9]|9[0-9]|100)%/u);
    expect(css).toMatch(/\.mp-layer\s+\.mp-meta\s*\{[^}]*line-height:\s*1\.5/u);
    expect(css).toMatch(/\.mp-layer\s+\.mp-meta\s+strong\s*\{[^}]*color:\s*var\(--foreground\)/u);
  });
});
