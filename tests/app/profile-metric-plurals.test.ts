import { describe, expect, it } from "vitest";
import { metricRows } from "../../src/app/profile/model";

function sentenceValue(metrics: Record<string, unknown>, locale: "en" | "ru"): string {
  const row = metricRows(metrics, locale).find((entry) =>
    locale === "ru" ? entry.label === "Длина предложения" : entry.label === "Sentence length",
  );
  return row?.value ?? "";
}

function postLenValue(metrics: Record<string, unknown>, locale: "en" | "ru"): string {
  const row = metricRows(metrics, locale).find((entry) =>
    locale === "ru" ? entry.label === "Длина поста, медиана" : entry.label === "Post length, median",
  );
  return row?.value ?? "";
}

describe("metricRows Russian plurals", () => {
  it("pluralizes sentence length", () => {
    expect(sentenceValue({ sentence_words_mean: 12 }, "ru")).toEqual("12 слов");
    expect(sentenceValue({ sentenceLength: 11.4 }, "ru")).toEqual("11,4 слова");
    expect(sentenceValue({ sentenceLength: 1 }, "ru")).toEqual("1 слово");
    expect(sentenceValue({ sentenceLength: 3 }, "ru")).toEqual("3 слова");
    expect(sentenceValue({ sentenceLength: 21 }, "ru")).toEqual("21 слово");
  });

  it("pluralizes median post length", () => {
    expect(postLenValue({ text_chars_median: 430 }, "ru")).toEqual("430 знаков");
    expect(postLenValue({ medianPostLength: 1 }, "ru")).toEqual("1 знак");
    expect(postLenValue({ medianPostLength: 122 }, "ru")).toEqual("122 знака");
    expect(postLenValue({ medianPostLength: 108.5 }, "ru")).toEqual("108,5 знака");
  });
});

describe("metricRows English plurals", () => {
  it("uses singular only for 1", () => {
    expect(sentenceValue({ sentenceLength: 12 }, "en")).toEqual("12 words");
    expect(sentenceValue({ sentenceLength: 1 }, "en")).toEqual("1 word");
    expect(postLenValue({ medianPostLength: 430 }, "en")).toEqual("430 chars");
    expect(postLenValue({ medianPostLength: 1 }, "en")).toEqual("1 char");
  });
});
