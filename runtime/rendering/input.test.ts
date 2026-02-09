import { describe, it } from "../testing/harness.ts";
import { screenToWorld } from "./input.ts";

describe("input", () => {
  describe("screenToWorld", () => {
    it("converts screen center to camera position (headless defaults)", () => {
      // In headless mode: camera at (0, 0), zoom 1.0, viewport 800x600
      // Screen center (400, 300) should map to camera position (0, 0)
      const world = screenToWorld(400, 300);

      // Allow small floating point error
      const epsilon = 0.01;
      if (Math.abs(world.x - 0) > epsilon || Math.abs(world.y - 0) > epsilon) {
        throw new Error(`Expected ~(0, 0), got (${world.x}, ${world.y})`);
      }
    });

    it("converts screen corners correctly (headless defaults)", () => {
      // In headless mode: camera at (0, 0), zoom 1.0, viewport 800x600
      // Top-left (0, 0) should map to (-400, -300)
      // Bottom-right (800, 600) should map to (400, 300)
      const topLeft = screenToWorld(0, 0);
      const bottomRight = screenToWorld(800, 600);

      const epsilon = 0.01;
      if (Math.abs(topLeft.x - (-400)) > epsilon || Math.abs(topLeft.y - (-300)) > epsilon) {
        throw new Error(`Top-left: expected ~(-400, -300), got (${topLeft.x}, ${topLeft.y})`);
      }
      if (Math.abs(bottomRight.x - 400) > epsilon || Math.abs(bottomRight.y - 300) > epsilon) {
        throw new Error(`Bottom-right: expected ~(400, 300), got (${bottomRight.x}, ${bottomRight.y})`);
      }
    });

    it("converts arbitrary screen position correctly", () => {
      // In headless mode: camera at (0, 0), zoom 1.0, viewport 800x600
      // Screen position (600, 450) should map to:
      // normX = 600/800 = 0.75, normY = 450/600 = 0.75
      // halfW = 400, halfH = 300
      // worldX = -400 + 0.75 * 800 = -400 + 600 = 200
      // worldY = -300 + 0.75 * 600 = -300 + 450 = 150
      const world = screenToWorld(600, 450);

      const epsilon = 0.01;
      if (Math.abs(world.x - 200) > epsilon || Math.abs(world.y - 150) > epsilon) {
        throw new Error(`Expected ~(200, 150), got (${world.x}, ${world.y})`);
      }
    });

    it("handles edge cases", () => {
      // Test negative coordinates (should still work mathematically)
      const negativeScreen = screenToWorld(-100, -50);
      // normX = -100/800 = -0.125, normY = -50/600 = -0.0833
      // worldX = -400 + (-0.125) * 800 = -400 - 100 = -500
      // worldY = -300 + (-0.0833) * 600 = -300 - 50 = -350
      const epsilon = 0.01;
      if (Math.abs(negativeScreen.x - (-500)) > epsilon || Math.abs(negativeScreen.y - (-350)) > epsilon) {
        throw new Error(`Negative coords: expected ~(-500, -350), got (${negativeScreen.x}, ${negativeScreen.y})`);
      }

      // Test large coordinates (beyond viewport)
      const largeScreen = screenToWorld(1600, 1200);
      // normX = 1600/800 = 2, normY = 1200/600 = 2
      // worldX = -400 + 2 * 800 = -400 + 1600 = 1200
      // worldY = -300 + 2 * 600 = -300 + 1200 = 900
      if (Math.abs(largeScreen.x - 1200) > epsilon || Math.abs(largeScreen.y - 900) > epsilon) {
        throw new Error(`Large coords: expected ~(1200, 900), got (${largeScreen.x}, ${largeScreen.y})`);
      }
    });
  });
});
