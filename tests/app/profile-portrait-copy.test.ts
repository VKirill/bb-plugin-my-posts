import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PortraitCard } from "../../src/app/profile/PortraitCard";
import { metricRows, rulesLines } from "../../src/app/profile/model";
import type { Profile } from "../../src/shared/model";

function corpusValue(metrics: { texts: number; chars: number }, locale: "en" | "ru"): string {
  const row = metricRows(metrics, locale).find((entry) => entry.label === (locale === "ru" ? "Корпус" : "Corpus"));
  return row?.value ?? "";
}

describe("metricRows corpus copy", () => {
  it("pluralizes Russian posts and shows small corpora in exact chars", () => {
    expect(corpusValue({ texts: 1, chars: 108 }, "ru")).toEqual("1 пост · 108 знаков");
    expect(corpusValue({ texts: 3, chars: 2400 }, "ru")).toEqual("3 поста · 2 тыс. знаков");
    expect(corpusValue({ texts: 146, chars: 58000 }, "ru")).toEqual("146 постов · 58 тыс. знаков");
    expect(corpusValue({ texts: 21, chars: 900 }, "ru")).toEqual("21 пост · 900 знаков");
    expect(corpusValue({ texts: 12, chars: 5000 }, "ru")).toEqual("12 постов · 5 тыс. знаков");
  });

  it("pluralizes English posts and formats large corpora in thousands", () => {
    expect(corpusValue({ texts: 1, chars: 108 }, "en")).toEqual("1 post · 108 chars");
    expect(corpusValue({ texts: 146, chars: 58000 }, "en")).toEqual("146 posts · 58k chars");
  });

  it("still drops raw keys and nested objects from metrics", () => {
    expect(
      metricRows({ texts: 2, chars: 500, ttr_raw: 0.5, extra: { nested: true } }, "en"),
    ).toEqual([{ label: "Corpus", value: "2 posts · 500 chars" }]);
  });
});

describe("rulesLines", () => {
  const sampleMd = [
    "## Voice",
    "tone",
    "",
    "## C · Правила генерации",
    "- First rule",
    "* Second rule",
    "1. Third rule",
    "",
    "## Другое",
    "skip",
  ].join("\n");

  it("extracts up to six stripped lines from the rules section", () => {
    expect(rulesLines(sampleMd)).toEqual(["First rule", "Second rule", "Third rule"]);
  });

  it("matches English generation rules headings", () => {
    const md = "## Writing rules\n- Keep it short\n# Top level stops\n";
    expect(rulesLines(md)).toEqual(["Keep it short"]);
  });

  it("returns an empty list when there is no rules section", () => {
    expect(rulesLines("## Voice only\n- trait\n")).toEqual([]);
  });

  it("stops at six lines", () => {
    const md = [
      "## Generation rules",
      "- one",
      "- two",
      "- three",
      "- four",
      "- five",
      "- six",
      "- seven",
    ].join("\n");
    expect(rulesLines(md)).toEqual(["one", "two", "three", "four", "five", "six"]);
  });
});

describe("PortraitCard layer C", () => {
  it("renders rules under the layer C head as mp-meta lines", () => {
    const profile: Profile = {
      id: "prf_rules",
      name: "Test",
      source: "",
      status: "ready",
      styleMd: "## Правила генерации\n- Rule alpha\n- Rule beta\n",
      metrics: { texts: 1, chars: 100 },
      traits: ["warm"],
      styleThreadId: "thr_1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const html = renderToStaticMarkup(createElement(PortraitCard, { profile }));
    expect(html).toContain('class="mp-meta"');
    expect(html).toContain("Rule alpha");
    expect(html).toContain("Rule beta");
  });
});
