import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  setAmbientLight,
  addPointLight,
  clearLights,
  enableGlobalIllumination,
  disableGlobalIllumination,
  setGIIntensity,
  setGIQuality,
  addEmissive,
  clearEmissives,
  addOccluder,
  clearOccluders,
  addDirectionalLight,
  addSpotLight,
  colorTemp,
  setDayNightCycle,
} from "./lighting.ts";

// --- Backward-compatible API (headless no-ops) ---

describe("lighting — existing API", () => {
  it("setAmbientLight does not throw in headless mode", () => {
    setAmbientLight(0.5, 0.5, 0.5);
    setAmbientLight(0, 0, 0);
    setAmbientLight(1, 1, 1);
  });

  it("addPointLight does not throw in headless mode", () => {
    addPointLight(100, 200, 150);
    addPointLight(0, 0, 50, 1, 0.5, 0.3, 2.0);
  });

  it("clearLights does not throw in headless mode", () => {
    clearLights();
  });
});

// --- Global Illumination API ---

describe("lighting — GI control", () => {
  it("enableGlobalIllumination does not throw in headless mode", () => {
    enableGlobalIllumination();
  });

  it("disableGlobalIllumination does not throw in headless mode", () => {
    disableGlobalIllumination();
  });

  it("setGIIntensity does not throw in headless mode", () => {
    setGIIntensity(1.0);
    setGIIntensity(0.5);
    setGIIntensity(2.0);
  });
});

// --- GI Quality ---

describe("lighting — GI quality", () => {
  it("setGIQuality does not throw with empty options", () => {
    setGIQuality({});
  });

  it("setGIQuality accepts individual params", () => {
    setGIQuality({ probeSpacing: 4 });
    setGIQuality({ interval: 2 });
    setGIQuality({ cascadeCount: 3 });
  });

  it("setGIQuality accepts all params combined", () => {
    setGIQuality({ probeSpacing: 16, interval: 8, cascadeCount: 5 });
  });
});

// --- Emissive Surfaces ---

describe("lighting — emissives", () => {
  it("addEmissive does not throw in headless mode", () => {
    addEmissive({ x: 10, y: 20, width: 32, height: 32 });
    addEmissive({
      x: 100,
      y: 200,
      width: 64,
      height: 16,
      r: 1,
      g: 0.5,
      b: 0,
      intensity: 3.0,
    });
  });

  it("clearEmissives does not throw in headless mode", () => {
    clearEmissives();
  });
});

// --- Occluders ---

describe("lighting — occluders", () => {
  it("addOccluder does not throw in headless mode", () => {
    addOccluder({ x: 50, y: 60, width: 100, height: 20 });
    addOccluder({ x: 0, y: 0, width: 800, height: 10 });
  });

  it("clearOccluders does not throw in headless mode", () => {
    clearOccluders();
  });
});

// --- Directional Lights ---

describe("lighting — directional lights", () => {
  it("addDirectionalLight does not throw in headless mode", () => {
    addDirectionalLight({ angle: 0 });
    addDirectionalLight({ angle: Math.PI / 4, r: 1, g: 0.9, b: 0.7, intensity: 0.8 });
  });
});

// --- Spot Lights ---

describe("lighting — spot lights", () => {
  it("addSpotLight does not throw in headless mode", () => {
    addSpotLight({ x: 100, y: 200, angle: 0 });
    addSpotLight({
      x: 400,
      y: 300,
      angle: Math.PI,
      spread: 0.3,
      range: 300,
      r: 1,
      g: 1,
      b: 0.8,
      intensity: 1.5,
    });
  });
});

// --- Color Temperature ---

describe("lighting — color temperature presets", () => {
  it("colorTemp has expected presets", () => {
    assert.ok(Array.isArray(colorTemp.candlelight));
    assert.equal(colorTemp.candlelight.length, 3);
    assert.ok(colorTemp.candlelight[0] > 0.9); // warm red

    assert.ok(Array.isArray(colorTemp.moonlight));
    assert.equal(colorTemp.moonlight.length, 3);
    assert.ok(colorTemp.moonlight[2] > colorTemp.moonlight[0]); // blue-ish

    assert.ok(Array.isArray(colorTemp.neonPink));
    assert.ok(Array.isArray(colorTemp.neonBlue));
    assert.ok(Array.isArray(colorTemp.neonGreen));
    assert.ok(Array.isArray(colorTemp.torch));
    assert.ok(Array.isArray(colorTemp.magic));
    assert.ok(Array.isArray(colorTemp.blood));
    assert.ok(Array.isArray(colorTemp.daylight));
    assert.ok(Array.isArray(colorTemp.fluorescent));
    assert.ok(Array.isArray(colorTemp.incandescent));
    assert.ok(Array.isArray(colorTemp.warmWhite));
  });

  it("all presets have 3 components in 0-1 range", () => {
    for (const [name, rgb] of Object.entries(colorTemp)) {
      assert.equal((rgb as number[]).length, 3, `${name} should have 3 components`);
      for (const v of rgb as number[]) {
        assert.ok(v >= 0.0 && v <= 1.0, `${name}: value ${v} out of range`);
      }
    }
  });
});

// --- Day/Night Cycle ---

describe("lighting — day/night cycle", () => {
  it("setDayNightCycle does not throw for various times", () => {
    setDayNightCycle({ timeOfDay: 0.0 }); // midnight
    setDayNightCycle({ timeOfDay: 0.25 }); // dawn
    setDayNightCycle({ timeOfDay: 0.5 }); // noon
    setDayNightCycle({ timeOfDay: 0.75 }); // dusk
    setDayNightCycle({ timeOfDay: 1.0 }); // midnight again
  });

  it("setDayNightCycle accepts intensity option", () => {
    setDayNightCycle({ timeOfDay: 0.5, intensity: 0.5 });
    setDayNightCycle({ timeOfDay: 0.5, intensity: 2.0 });
  });

  it("setDayNightCycle handles wrapping (t > 1)", () => {
    setDayNightCycle({ timeOfDay: 1.5 }); // should wrap
    setDayNightCycle({ timeOfDay: 3.75 }); // should wrap
  });
});
