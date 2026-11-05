import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CreateProfileForm } from "../../src/app/profile/CreateProfileDialog";
import { afterCreateRoute, createDialogExitRoute } from "../../src/app/profile/model";
import { parseRoute, routePath } from "../../src/app/routes";
import type { Profile } from "../../src/shared/model";

vi.mock("../../src/app/data", () => ({
  useMpRpc: () => ({
    call: vi.fn(),
  }),
}));

vi.mock("../../src/app/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/i18n")>();
  const dict = actual.DICTIONARIES.ru;
  return {
    ...actual,
    useLocale: () => "ru" as const,
    t: (key: keyof typeof dict, vars?: Record<string, string | number>) => {
      const template = dict[key];
      if (vars === undefined) return template;
      return template.replace(/\{(\w+)\}/gu, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      );
    },
  };
});

function makeProfile(id: string): Profile {
  return {
    id,
    name: "Voice",
    source: "",
    status: "building",
    styleMd: "",
    metrics: {},
    traits: [],
    styleThreadId: "thr_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("createDialogExitRoute", () => {
  it("returns home when there is no last profile id", () => {
    expect(createDialogExitRoute(null)).toEqual({ kind: "home" });
  });

  it("returns the last profile when an id exists", () => {
    expect(createDialogExitRoute("prf_9")).toEqual({ kind: "profile", profileId: "prf_9" });
  });
});

describe("create profile deep link", () => {
  it('keeps the "create" path as create-profile', () => {
    expect(parseRoute("create")).toEqual({ kind: "create-profile" });
    expect(routePath({ kind: "create-profile" })).toEqual("create");
  });
});

describe("afterCreateRoute", () => {
  it("still opens the voice tab after create", () => {
    expect(afterCreateRoute(makeProfile("prf_new"))).toEqual({
      kind: "profile",
      profileId: "prf_new",
      tab: "voice",
    });
  });
});

describe("CreateProfileForm", () => {
  it("shows Russian labels and disables submit while the name is empty", () => {
    const html = renderToStaticMarkup(
      createElement(CreateProfileForm, { onCreated: () => {}, onCancel: () => {} }),
    );
    expect(html).toContain("Название профиля");
    expect(html).toContain("Источник");
    expect(html).toContain("Создать профиль");
    expect(html).toContain("Отмена");
    expect(html).toMatch(/disabled(?:="")?/u);
  });
});
