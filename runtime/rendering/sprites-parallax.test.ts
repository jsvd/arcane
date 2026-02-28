import { describe, it } from "../testing/harness.ts";
import { drawSprite } from "./sprites.ts";

describe("drawSprite with parallax", () => {
  it("does not throw in headless mode with parallax 0", () => {
    drawSprite({
      textureId: 1,
      x: 0,
      y: 0,
      w: 800,
      h: 600,
      parallax: 0,
    });
  });

  it("does not throw in headless mode with parallax 0.5", () => {
    drawSprite({
      textureId: 1,
      x: 100,
      y: 200,
      w: 400,
      h: 300,
      parallax: 0.5,
      layer: 1,
    });
  });

  it("does not throw in headless mode with parallax 1.0", () => {
    drawSprite({
      textureId: 1,
      x: 0,
      y: 0,
      w: 800,
      h: 600,
      parallax: 1.0,
      layer: 2,
    });
  });

  it("handles parallax > 1.0 (foreground parallax)", () => {
    drawSprite({
      textureId: 1,
      x: 0,
      y: 0,
      w: 800,
      h: 600,
      parallax: 1.5,
    });
  });

  it("passes through all sprite options with parallax", () => {
    drawSprite({
      textureId: 1,
      x: 100,
      y: 200,
      w: 64,
      h: 64,
      parallax: 0.3,
      layer: 5,
      uv: { x: 0, y: 0, w: 0.5, h: 0.5 },
      tint: { r: 1, g: 0, b: 0, a: 1 },
      rotation: 0.5,
      flipX: true,
      opacity: 0.8,
    });
  });
});
