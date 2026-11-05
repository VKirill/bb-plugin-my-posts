import { describe, expect, it } from "vitest";
import { core } from "../../src/app/i18n/core";
import { DICTIONARIES } from "../../src/app/i18n";
import { post } from "../../src/app/i18n/post";
import { profile } from "../../src/app/i18n/profile";

function keysOf(group: { en: Record<string, string>; ru: Record<string, string> }): void {
  expect(Object.keys(group.ru).sort()).toEqual(Object.keys(group.en).sort());
}

describe("i18n dictionaries", () => {
  it("core EN and RU have identical key sets", () => {
    keysOf(core);
  });

  it("profile EN and RU have identical key sets", () => {
    keysOf(profile);
  });

  it("post EN and RU have identical key sets", () => {
    keysOf(post);
  });

  it("merged EN and RU have identical key sets", () => {
    expect(Object.keys(DICTIONARIES.ru).sort()).toEqual(Object.keys(DICTIONARIES.en).sort());
  });
});
