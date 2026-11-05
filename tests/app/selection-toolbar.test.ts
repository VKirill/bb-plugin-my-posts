import { describe, expect, it } from "vitest";
import { toolbarPosition } from "../../src/app/post/layout";

const column = { left: 40, top: 0, right: 400, bottom: 16000, width: 360, height: 16000 };
const toolbar = { width: 280, height: 36 };
const viewport = { width: 420, height: 900 };

describe("toolbarPosition viewport clamp", () => {
  it("keeps a far-below-the-fold anchor inside the viewport", () => {
    const anchor = { left: 80, top: 15000, right: 200, bottom: 15020, width: 120, height: 20 };
    const pos = toolbarPosition(anchor, column, toolbar, viewport);
    expect(pos.top).toBeLessThanOrEqual(900 - 36 - 8);
  });

  it("sits above the selected line when there is room", () => {
    const anchor = { left: 80, top: 100, right: 200, bottom: 120, width: 120, height: 20 };
    const pos = toolbarPosition(anchor, column, toolbar, viewport);
    expect(pos.top).toBe(100 - 36 - 8);
  });

  it("clamps left inside the column with an 8px inset", () => {
    const farLeft = { left: 0, top: 100, right: 10, bottom: 120, width: 10, height: 20 };
    const leftPos = toolbarPosition(farLeft, column, toolbar, viewport);
    expect(leftPos.left).toBeGreaterThanOrEqual(column.left + 8);

    const farRight = { left: 390, top: 100, right: 410, bottom: 120, width: 20, height: 20 };
    const rightPos = toolbarPosition(farRight, column, toolbar, viewport);
    expect(rightPos.left + toolbar.width).toBeLessThanOrEqual(column.right - 8);
  });
});
