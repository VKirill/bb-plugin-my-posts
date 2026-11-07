import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  deleteProfileText,
  rebuildPrompt,
  routeAfterProfileDelete,
} from "../../src/app/profile/manage";
import type { Profile } from "../../src/shared/model";
import { ConfirmDialogBody } from "../../src/app/ui/ConfirmDialog";

function makeProfile(id: string, name = id): Profile {
  return {
    id,
    name,
    source: "",
    status: "ready",
    styleMd: "",
    metrics: {},
    traits: [],
    styleThreadId: "thr_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("routeAfterProfileDelete", () => {
  it("opens the next remaining profile, or home when the last one is gone", () => {
    const a = makeProfile("A");
    const b = makeProfile("B");
    const c = makeProfile("C");
    expect(routeAfterProfileDelete([a, b, c], "B")).toEqual({ kind: "profile", profileId: "C" });
    expect(routeAfterProfileDelete([a, b], "B")).toEqual({ kind: "profile", profileId: "A" });
    expect(routeAfterProfileDelete([a], "A")).toEqual({ kind: "home" });
  });
});

describe("deleteProfileText", () => {
  it("names the profile and the post count in the owner's language", () => {
    expect(deleteProfileText("Кирилл", 5, "ru")).toContain("«Кирилл»");
    expect(deleteProfileText("Кирилл", 5, "ru")).toContain("5 постов");
    expect(deleteProfileText("Kirill", 1, "en")).toContain("Kirill");
    expect(deleteProfileText("Kirill", 1, "en")).toContain("1 post");
  });
});

describe("rebuildPrompt", () => {
  it("returns a non-empty Russian instruction", () => {
    expect(rebuildPrompt("ru")).toMatch(/[А-Яа-яЁё]/u);
    expect(rebuildPrompt("ru").length).toBeGreaterThan(0);
  });
});

describe("ConfirmDialogBody", () => {
  it("renders the title, the text and the confirm button", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialogBody, {
        title: "Delete profile?",
        text: "This cannot be undone.",
        confirmLabel: "Delete profile",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("Delete profile?");
    expect(html).toContain("This cannot be undone.");
    expect(html).toContain(">Delete profile</button>");
  });
});
