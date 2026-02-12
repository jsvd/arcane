import { describe, it } from "../testing/harness.ts";
import { drawParallaxSprite } from "./parallax.ts";

describe("parallax", () => {
  describe("drawParallaxSprite", () => {
    it("does not throw in headless mode with factor 0", () => {
      drawParallaxSprite({
        textureId: 1,
        x: 0,
        y: 0,
        w: 800,
        h: 600,
        parallaxFactor: 0,
      });
    });

    it("does not throw in headless mode with factor 0.5", () => {
      drawParallaxSprite({
        textureId: 1,
        x: 100,
        y: 200,
        w: 400,
        h: 300,
        parallaxFactor: 0.5,
        layer: 1,
      });
    });

    it("does not throw in headless mode with factor 1.0", () => {
      drawParallaxSprite({
        textureId: 1,
        x: 0,
        y: 0,
        w: 800,
        h: 600,
        parallaxFactor: 1.0,
        layer: 2,
      });
    });

    it("handles factor > 1.0 (foreground parallax)", () => {
      drawParallaxSprite({
        textureId: 1,
        x: 0,
        y: 0,
        w: 800,
        h: 600,
        parallaxFactor: 1.5,
      });
    });

    it("passes through all sprite options", () => {
      drawParallaxSprite({
        textureId: 1,
        x: 100,
        y: 200,
        w: 64,
        h: 64,
        parallaxFactor: 0.3,
        layer: 5,
        uv: { x: 0, y: 0, w: 0.5, h: 0.5 },
        tint: { r: 1, g: 0, b: 0, a: 1 },
        rotation: 0.5,
        flipX: true,
        opacity: 0.8,
      });
    });
  });
});
