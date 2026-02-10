import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { drawRect, drawPanel, drawBar, drawLabel } from "./primitives.ts";
import { rgb } from "./types.ts";

describe("rgb helper", () => {
  it("should normalize 0-255 values to 0.0-1.0 range", () => {
    const color = rgb(255, 128, 0);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 128 / 255, "g should be ~0.502");
    assert.equal(color.b, 0.0, "b should be 0.0");
    assert.equal(color.a, 1.0, "a should default to 1.0");
  });

  it("should accept optional alpha parameter", () => {
    const color = rgb(255, 0, 0, 128);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 0.0, "g should be 0.0");
    assert.equal(color.b, 0.0, "b should be 0.0");
    assert.equal(color.a, 128 / 255, "a should be ~0.502");
  });

  it("should handle black (0, 0, 0)", () => {
    const color = rgb(0, 0, 0);
    assert.equal(color.r, 0.0, "r should be 0.0");
    assert.equal(color.g, 0.0, "g should be 0.0");
    assert.equal(color.b, 0.0, "b should be 0.0");
    assert.equal(color.a, 1.0, "a should be 1.0");
  });

  it("should handle white (255, 255, 255)", () => {
    const color = rgb(255, 255, 255);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 1.0, "g should be 1.0");
    assert.equal(color.b, 1.0, "b should be 1.0");
    assert.equal(color.a, 1.0, "a should be 1.0");
  });

  it("should handle fully transparent (255, 255, 255, 0)", () => {
    const color = rgb(255, 255, 255, 0);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 1.0, "g should be 1.0");
    assert.equal(color.b, 1.0, "b should be 1.0");
    assert.equal(color.a, 0.0, "a should be 0.0");
  });
});

describe("ui primitives", () => {
  it("drawRect does not throw in headless mode", () => {
    drawRect(10, 20, 100, 50);
    drawRect(0, 0, 200, 100, { color: { r: 1, g: 0, b: 0, a: 1 } });
  });

  it("drawPanel does not throw in headless mode", () => {
    drawPanel(10, 20, 200, 100);
    drawPanel(0, 0, 300, 200, {
      fillColor: { r: 0.1, g: 0.1, b: 0.2, a: 0.9 },
      borderColor: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
      borderWidth: 3,
    });
  });

  it("drawBar does not throw in headless mode", () => {
    drawBar(10, 20, 100, 16, 0.75);
    drawBar(0, 0, 200, 20, 1.0, {
      fillColor: { r: 0, g: 1, b: 0, a: 1 },
      bgColor: { r: 0.3, g: 0, b: 0, a: 1 },
    });
  });

  it("drawBar clamps fill ratio to 0-1", () => {
    // Should not throw with out-of-range values
    drawBar(0, 0, 100, 10, -0.5);
    drawBar(0, 0, 100, 10, 2.0);
  });

  it("drawBar with border does not throw in headless mode", () => {
    drawBar(10, 20, 100, 16, 0.5, {
      borderColor: { r: 1, g: 1, b: 1, a: 1 },
      borderWidth: 1,
    });
  });

  it("drawLabel does not throw in headless mode", () => {
    drawLabel("Hello", 10, 20);
    drawLabel("Score: 42", 100, 50, {
      textColor: { r: 1, g: 1, b: 0, a: 1 },
      padding: 8,
      scale: 2,
    });
  });

  it("drawPanel with zero border width works", () => {
    drawPanel(0, 0, 100, 50, { borderWidth: 0 });
  });

  it("drawLabel with custom colors works", () => {
    drawLabel("HP", 0, 0, {
      textColor: { r: 1, g: 0, b: 0, a: 1 },
      bgColor: { r: 0, g: 0, b: 0, a: 0.8 },
      borderColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      borderWidth: 2,
      padding: 6,
    });
  });
});
