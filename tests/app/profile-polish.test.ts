import { describe, expect, it } from "vitest";
import { metricRows, sourceLine } from "../../src/app/profile/model";

describe("metricRows", () => {
  it("formats corpus, sentence length and median post length in Russian", () => {
    expect(
      metricRows(
        {
          texts: 146,
          chars: 58000,
          sentenceLength: 11.4,
          medianPostLength: 620,
          ttr_raw: 0.865,
          extra: { nested: true },
        },
        "ru",
      ),
    ).toEqual([
      { label: "Корпус", value: "146 постов · 58 тыс. знаков" },
      { label: "Длина предложения", value: "11,4 слова" },
      { label: "Длина поста, медиана", value: "620 знаков" },
    ]);
  });
});

describe("sourceLine", () => {
  it("uses pasted and empty labels, and keeps a URL", () => {
    expect(sourceLine("", "ru")).toEqual("Без источника");
    expect(sourceLine("черновик канала", "ru")).toEqual("Свой текст");
    expect(sourceLine("https://t.me/demo", "ru")).toEqual("https://t.me/demo");
  });
});

