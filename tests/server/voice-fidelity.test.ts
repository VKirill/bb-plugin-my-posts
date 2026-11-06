import { describe, expect, it } from "vitest";
import { rulesLines } from "../../src/app/profile/model";

describe("rulesLines", () => {
  it("skips sub-headings inside the rules section", () => {
    const styleMd = "## Правила генерации\n### do\n- А\n- Б\n### avoid\n- В\n## Другое";
    expect(rulesLines(styleMd)).toEqual(["А", "Б", "В"]);
  });
});
