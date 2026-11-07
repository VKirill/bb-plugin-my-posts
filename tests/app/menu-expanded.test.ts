import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Popover, popoverAnchor } from "../../src/app/ui/Popover";

function markup(open: boolean): string {
  return renderToStaticMarkup(
    createElement(Popover, {
      open,
      onClose: () => undefined,
      anchor: popoverAnchor(createElement("button", { type: "button" }, "Menu"), open),
      children: "item",
    }),
  );
}

describe("Popover menu trigger", () => {
  it("sets aria-expanded and aria-haspopup from the open state", () => {
    const opened = markup(true);
    expect(opened).toContain('aria-expanded="true"');
    expect(opened).toContain('aria-haspopup="menu"');
    expect([...opened.matchAll(/aria-expanded="([^"]*)"/g)].map((match) => match[1])).toEqual(["true"]);

    const closed = markup(false);
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('aria-haspopup="menu"');
    expect([...closed.matchAll(/aria-expanded="([^"]*)"/g)].map((match) => match[1])).toEqual(["false"]);
  });
});
