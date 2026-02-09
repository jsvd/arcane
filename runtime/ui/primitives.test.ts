import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { drawRect, drawPanel, drawBar, drawLabel } from "./primitives.ts";

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
