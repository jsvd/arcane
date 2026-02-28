import { describe, it } from "../testing/harness.ts";
import { screenToWorld } from "./input.ts";

describe("input", () => {
  describe("screenToWorld", () => {
    it("converts screen top-left to camera position (headless defaults)", () => {
      // In headless mode: camera at (0, 0), zoom 1.0, viewport 800x600
      // Camera (0,0) = top-left, so screen (0,0) maps to world (0,0)
      const world = screenToWorld(0, 0);

      const epsilon = 0.01;
      if (Math.abs(world.x - 0) > epsilon || Math.abs(world.y - 0) > epsilon) {
        throw new Error(`Expected ~(0, 0), got (${world.x}, ${world.y})`);
      }
    });

    it("converts screen positions correctly (headless defaults)", () => {
      // In headless mode: camera at (0, 0), zoom 1.0
      // Camera position is top-left, so screen coords map 1:1 to world coords
      const center = screenToWorld(400, 300);
      const bottomRight = screenToWorld(800, 600);

      const epsilon = 0.01;
      if (Math.abs(center.x - 400) > epsilon || Math.abs(center.y - 300) > epsilon) {
        throw new Error(`Center: expected ~(400, 300), got (${center.x}, ${center.y})`);
      }
      if (Math.abs(bottomRight.x - 800) > epsilon || Math.abs(bottomRight.y - 600) > epsilon) {
        throw new Error(`Bottom-right: expected ~(800, 600), got (${bottomRight.x}, ${bottomRight.y})`);
      }
    });

    it("converts arbitrary screen position correctly", () => {
      // In headless mode: camera at (0, 0), zoom 1.0
      // With top-left origin: worldX = cam.x + screenX / zoom = 0 + 600 = 600
      const world = screenToWorld(600, 450);

      const epsilon = 0.01;
      if (Math.abs(world.x - 600) > epsilon || Math.abs(world.y - 450) > epsilon) {
        throw new Error(`Expected ~(600, 450), got (${world.x}, ${world.y})`);
      }
    });

    it("handles edge cases", () => {
      // Test negative coordinates (should still work mathematically)
      // worldX = 0 + (-100) / 1 = -100
      const negativeScreen = screenToWorld(-100, -50);
      const epsilon = 0.01;
      if (Math.abs(negativeScreen.x - (-100)) > epsilon || Math.abs(negativeScreen.y - (-50)) > epsilon) {
        throw new Error(`Negative coords: expected ~(-100, -50), got (${negativeScreen.x}, ${negativeScreen.y})`);
      }

      // Test large coordinates (beyond viewport)
      // worldX = 0 + 1600 / 1 = 1600
      const largeScreen = screenToWorld(1600, 1200);
      if (Math.abs(largeScreen.x - 1600) > epsilon || Math.abs(largeScreen.y - 1200) > epsilon) {
        throw new Error(`Large coords: expected ~(1600, 1200), got (${largeScreen.x}, ${largeScreen.y})`);
      }
    });
  });
});
