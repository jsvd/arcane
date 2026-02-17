import { describe, it, assert } from "../testing/harness.ts";
import {
  createSpriteGroup,
  drawSpriteGroup,
  getSpritePart,
  setPartVisible,
} from "./sprite-group.ts";
import type { SpritePart } from "./sprite-group.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";
import type { SpriteDrawCall } from "../testing/visual.ts";

const RED = { r: 1, g: 0, b: 0, a: 1 };
const GREEN = { r: 0, g: 1, b: 0, a: 1 };
const BLUE = { r: 0, g: 0, b: 1, a: 1 };

function makeParts(): SpritePart[] {
  return [
    { name: "body", offsetX: 0, offsetY: 0, w: 16, h: 16, color: RED },
    { name: "head", offsetX: 2, offsetY: -12, w: 12, h: 12, color: GREEN },
    { name: "sword", offsetX: 14, offsetY: -2, w: 6, h: 20, color: BLUE, layerOffset: 1 },
  ];
}

describe("createSpriteGroup", () => {
  it("creates a group with the correct number of parts", () => {
    const group = createSpriteGroup(makeParts(), 5);
    assert.equal(group.parts.length, 3);
    assert.equal(group.baseLayer, 5);
  });

  it("shallow copies parts so mutating the original does not affect the group", () => {
    const original = makeParts();
    const group = createSpriteGroup(original, 0);
    original[0].offsetX = 999;
    assert.equal(group.parts[0].offsetX, 0);
  });

  it("uses default baseLayer of 0 when not specified", () => {
    const group = createSpriteGroup(makeParts());
    assert.equal(group.baseLayer, 0);
  });
});

describe("drawSpriteGroup", () => {
  it("draws one sprite per visible part", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const group = createSpriteGroup(makeParts(), 0);
    drawSpriteGroup(group, 100, 200);
    const calls = getDrawCalls().filter(c => c.type === "sprite");
    assert.equal(calls.length, 3);
    disableDrawCallCapture();
  });

  it("skips parts with visible === false", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const group = createSpriteGroup(makeParts(), 0);
    group.parts[1].visible = false;
    drawSpriteGroup(group, 100, 200);
    const calls = getDrawCalls().filter(c => c.type === "sprite");
    assert.equal(calls.length, 2);
    disableDrawCallCapture();
  });

  it("applies group opacity to part opacity", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const parts: SpritePart[] = [
      { name: "a", offsetX: 0, offsetY: 0, w: 8, h: 8, color: RED, opacity: 0.5 },
    ];
    const group = createSpriteGroup(parts, 0);
    drawSpriteGroup(group, 0, 0, { opacity: 0.4 });
    const calls = getDrawCalls().filter(c => c.type === "sprite") as SpriteDrawCall[];
    assert.equal(calls.length, 1);
    // 0.5 * 0.4 = 0.2
    const diff = Math.abs(calls[0].opacity - 0.2);
    assert.ok(diff < 0.001, `expected opacity ~0.2, got ${calls[0].opacity}`);
    disableDrawCallCapture();
  });

  it("with flipX negates offsetX and shifts by -part.w", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const parts: SpritePart[] = [
      { name: "a", offsetX: 10, offsetY: 5, w: 20, h: 20, color: RED },
    ];
    const group = createSpriteGroup(parts, 0);
    drawSpriteGroup(group, 100, 200, { flipX: true });
    const calls = getDrawCalls().filter(c => c.type === "sprite") as SpriteDrawCall[];
    assert.equal(calls.length, 1);
    // flipped: x = 100 - 10 - 20 = 70
    assert.equal(calls[0].x, 70);
    // y is unchanged: 200 + 5 = 205
    assert.equal(calls[0].y, 205);
    assert.equal(calls[0].flipX, true);
    disableDrawCallCapture();
  });

  it("flipWithParent: false prevents flip on that part", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const parts: SpritePart[] = [
      { name: "a", offsetX: 10, offsetY: 0, w: 20, h: 20, color: RED, flipWithParent: false },
    ];
    const group = createSpriteGroup(parts, 0);
    drawSpriteGroup(group, 100, 200, { flipX: true });
    const calls = getDrawCalls().filter(c => c.type === "sprite") as SpriteDrawCall[];
    assert.equal(calls.length, 1);
    // not flipped: x = 100 + 10 = 110
    assert.equal(calls[0].x, 110);
    assert.equal(calls[0].flipX, false);
    disableDrawCallCapture();
  });

  it("computes correct layer from baseLayer + layerOffset", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const parts: SpritePart[] = [
      { name: "a", offsetX: 0, offsetY: 0, w: 8, h: 8, color: RED, layerOffset: 3 },
      { name: "b", offsetX: 0, offsetY: 0, w: 8, h: 8, color: GREEN },
    ];
    const group = createSpriteGroup(parts, 10);
    drawSpriteGroup(group, 0, 0);
    const calls = getDrawCalls().filter(c => c.type === "sprite") as SpriteDrawCall[];
    assert.equal(calls.length, 2);
    assert.equal(calls[0].layer, 13); // 10 + 3
    assert.equal(calls[1].layer, 10); // 10 + 0
    disableDrawCallCapture();
  });
});

describe("getSpritePart", () => {
  it("finds a part by name", () => {
    const group = createSpriteGroup(makeParts(), 0);
    const head = getSpritePart(group, "head");
    assert.ok(head !== undefined, "expected to find 'head' part");
    assert.equal(head!.name, "head");
    assert.equal(head!.w, 12);
  });

  it("returns undefined for non-existent name", () => {
    const group = createSpriteGroup(makeParts(), 0);
    const missing = getSpritePart(group, "shield");
    assert.equal(missing, undefined);
  });
});

describe("setPartVisible", () => {
  it("toggles part visibility", () => {
    const group = createSpriteGroup(makeParts(), 0);
    const sword = getSpritePart(group, "sword");
    assert.ok(sword !== undefined);
    assert.ok(sword!.visible === undefined || sword!.visible === true, "initially visible");

    setPartVisible(group, "sword", false);
    assert.equal(sword!.visible, false);

    setPartVisible(group, "sword", true);
    assert.equal(sword!.visible, true);
  });
});
