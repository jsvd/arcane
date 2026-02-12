import { describe, it, assert } from "../testing/harness.ts";
import {
  verticalStack,
  horizontalRow,
  anchorPosition,
  verticalStackVariableHeight,
  horizontalRowVariableWidth,
  verticalStackHeight,
  horizontalRowWidth,
} from "./layout.ts";

describe("verticalStack", () => {
  it("positions items in a vertical column", () => {
    const pos = verticalStack(10, 20, 30, 3, 5);
    assert.equal(pos.length, 3);
    assert.deepEqual(pos[0], { x: 10, y: 20 });
    assert.deepEqual(pos[1], { x: 10, y: 55 });
    assert.deepEqual(pos[2], { x: 10, y: 90 });
  });

  it("uses default spacing of 4", () => {
    const pos = verticalStack(0, 0, 10, 2);
    assert.deepEqual(pos[0], { x: 0, y: 0 });
    assert.deepEqual(pos[1], { x: 0, y: 14 });
  });

  it("returns empty array for 0 count", () => {
    const pos = verticalStack(0, 0, 10, 0);
    assert.equal(pos.length, 0);
  });

  it("returns single item", () => {
    const pos = verticalStack(5, 10, 20, 1);
    assert.equal(pos.length, 1);
    assert.deepEqual(pos[0], { x: 5, y: 10 });
  });

  it("all items share the same X", () => {
    const pos = verticalStack(42, 0, 10, 3);
    for (const p of pos) {
      assert.equal(p.x, 42);
    }
  });
});

describe("horizontalRow", () => {
  it("positions items in a horizontal row", () => {
    const pos = horizontalRow(10, 20, 50, 3, 10);
    assert.equal(pos.length, 3);
    assert.deepEqual(pos[0], { x: 10, y: 20 });
    assert.deepEqual(pos[1], { x: 70, y: 20 });
    assert.deepEqual(pos[2], { x: 130, y: 20 });
  });

  it("uses default spacing of 4", () => {
    const pos = horizontalRow(0, 0, 20, 2);
    assert.deepEqual(pos[0], { x: 0, y: 0 });
    assert.deepEqual(pos[1], { x: 24, y: 0 });
  });

  it("returns empty array for 0 count", () => {
    const pos = horizontalRow(0, 0, 10, 0);
    assert.equal(pos.length, 0);
  });

  it("all items share the same Y", () => {
    const pos = horizontalRow(0, 42, 10, 3);
    for (const p of pos) {
      assert.equal(p.y, 42);
    }
  });
});

describe("anchorPosition", () => {
  it("top-left anchors to top-left corner with padding", () => {
    const pos = anchorPosition("top-left", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 10, y: 10 });
  });

  it("top-right anchors to top-right corner with padding", () => {
    const pos = anchorPosition("top-right", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 690, y: 10 });
  });

  it("bottom-left anchors to bottom-left corner", () => {
    const pos = anchorPosition("bottom-left", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 10, y: 540 });
  });

  it("bottom-right anchors to bottom-right corner", () => {
    const pos = anchorPosition("bottom-right", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 690, y: 540 });
  });

  it("center anchors to center of viewport", () => {
    const pos = anchorPosition("center", 800, 600, 100, 50);
    assert.deepEqual(pos, { x: 350, y: 275 });
  });

  it("top-center anchors to top center", () => {
    const pos = anchorPosition("top-center", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 350, y: 10 });
  });

  it("bottom-center anchors to bottom center", () => {
    const pos = anchorPosition("bottom-center", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 350, y: 540 });
  });

  it("center-left anchors to center left", () => {
    const pos = anchorPosition("center-left", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 10, y: 275 });
  });

  it("center-right anchors to center right", () => {
    const pos = anchorPosition("center-right", 800, 600, 100, 50, 10);
    assert.deepEqual(pos, { x: 690, y: 275 });
  });

  it("uses default padding of 10", () => {
    const pos = anchorPosition("top-left", 800, 600, 100, 50);
    assert.deepEqual(pos, { x: 10, y: 10 });
  });
});

describe("verticalStackVariableHeight", () => {
  it("positions items with varying heights", () => {
    const pos = verticalStackVariableHeight(10, 20, [30, 50, 20], 5);
    assert.equal(pos.length, 3);
    assert.deepEqual(pos[0], { x: 10, y: 20 });
    assert.deepEqual(pos[1], { x: 10, y: 55 });  // 20 + 30 + 5
    assert.deepEqual(pos[2], { x: 10, y: 110 }); // 55 + 50 + 5
  });

  it("handles empty array", () => {
    const pos = verticalStackVariableHeight(0, 0, []);
    assert.equal(pos.length, 0);
  });
});

describe("horizontalRowVariableWidth", () => {
  it("positions items with varying widths", () => {
    const pos = horizontalRowVariableWidth(10, 20, [60, 80, 40], 5);
    assert.equal(pos.length, 3);
    assert.deepEqual(pos[0], { x: 10, y: 20 });
    assert.deepEqual(pos[1], { x: 75, y: 20 });  // 10 + 60 + 5
    assert.deepEqual(pos[2], { x: 160, y: 20 }); // 75 + 80 + 5
  });

  it("handles empty array", () => {
    const pos = horizontalRowVariableWidth(0, 0, []);
    assert.equal(pos.length, 0);
  });
});

describe("verticalStackHeight", () => {
  it("computes total height for uniform items", () => {
    assert.equal(verticalStackHeight(30, 3, 5), 100); // 3*30 + 2*5
  });

  it("returns 0 for empty stack", () => {
    assert.equal(verticalStackHeight(30, 0), 0);
  });

  it("returns item height for single item", () => {
    assert.equal(verticalStackHeight(30, 1, 5), 30);
  });
});

describe("horizontalRowWidth", () => {
  it("computes total width for uniform items", () => {
    assert.equal(horizontalRowWidth(50, 3, 10), 170); // 3*50 + 2*10
  });

  it("returns 0 for empty row", () => {
    assert.equal(horizontalRowWidth(50, 0), 0);
  });

  it("returns item width for single item", () => {
    assert.equal(horizontalRowWidth(50, 1, 10), 50);
  });
});
