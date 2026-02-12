import { describe, it } from "../testing/harness.ts";
import {
  setCamera,
  getCamera,
  followTarget,
  setCameraBounds,
  getCameraBounds,
  setCameraDeadzone,
  getCameraDeadzone,
  followTargetSmooth,
} from "./camera.ts";

describe("camera", () => {
  describe("setCamera / getCamera", () => {
    it("returns default values in headless mode", () => {
      const cam = getCamera();
      if (cam.x !== 0 || cam.y !== 0 || cam.zoom !== 1) {
        throw new Error(`Expected (0, 0, 1), got (${cam.x}, ${cam.y}, ${cam.zoom})`);
      }
    });

    it("setCamera is a no-op in headless mode", () => {
      setCamera(100, 200, 2);
      const cam = getCamera();
      // In headless mode, camera stays at default
      if (cam.x !== 0 || cam.y !== 0 || cam.zoom !== 1) {
        throw new Error(`Expected (0, 0, 1) in headless, got (${cam.x}, ${cam.y}, ${cam.zoom})`);
      }
    });
  });

  describe("followTarget", () => {
    it("calls setCamera (no-op in headless)", () => {
      // Just verify it doesn't throw
      followTarget(100, 200);
      followTarget(100, 200, 2);
    });
  });

  describe("setCameraBounds / getCameraBounds", () => {
    it("returns null by default in headless mode", () => {
      const bounds = getCameraBounds();
      if (bounds !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(bounds)}`);
      }
    });

    it("setCameraBounds is a no-op in headless mode", () => {
      setCameraBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 800 });
      const bounds = getCameraBounds();
      // In headless mode, bounds ops are no-ops
      if (bounds !== null) {
        throw new Error(`Expected null in headless, got ${JSON.stringify(bounds)}`);
      }
    });

    it("setCameraBounds(null) does not throw", () => {
      setCameraBounds(null);
    });
  });

  describe("setCameraDeadzone / getCameraDeadzone", () => {
    // Reset deadzone before each test
    it("returns null by default", () => {
      setCameraDeadzone(null);
      const dz = getCameraDeadzone();
      if (dz !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(dz)}`);
      }
    });

    it("stores and returns deadzone", () => {
      setCameraDeadzone({ width: 200, height: 150 });
      const dz = getCameraDeadzone();
      if (!dz || dz.width !== 200 || dz.height !== 150) {
        throw new Error(`Expected { width: 200, height: 150 }, got ${JSON.stringify(dz)}`);
      }
      // Clean up
      setCameraDeadzone(null);
    });

    it("clears deadzone with null", () => {
      setCameraDeadzone({ width: 100, height: 100 });
      setCameraDeadzone(null);
      const dz = getCameraDeadzone();
      if (dz !== null) {
        throw new Error(`Expected null after clear, got ${JSON.stringify(dz)}`);
      }
    });
  });

  describe("followTarget with deadzone", () => {
    it("does not throw when deadzone is set", () => {
      setCameraDeadzone({ width: 200, height: 150 });
      followTarget(100, 100);
      // Clean up
      setCameraDeadzone(null);
    });
  });

  describe("followTargetSmooth", () => {
    it("does not throw in headless mode", () => {
      followTargetSmooth(100, 200, 1, 0.1);
    });

    it("does not throw with deadzone set", () => {
      setCameraDeadzone({ width: 200, height: 150 });
      followTargetSmooth(100, 200, 1, 0.1);
      setCameraDeadzone(null);
    });
  });
});
