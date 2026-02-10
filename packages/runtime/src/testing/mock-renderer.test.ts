/**
 * Tests demonstrating mock renderer usage
 */

import { describe, it, assert } from "./harness.ts";
import { mockRenderer, installMockRenderer, restoreRenderer } from "./mock-renderer.ts";

describe("Mock Renderer", () => {
  it("should validate drawRect parameters", () => {
    mockRenderer.reset();
    mockRenderer.drawRect(10.0, 20.0, 100.0, 50.0, { color: { r: 1.0, g: 0.5, b: 0.0 } });

    mockRenderer.assertNoErrors();
    mockRenderer.assertCalled("drawRect", 1);
  });

  it("should catch wrong parameter types", () => {
    mockRenderer.reset();
    // Wrong: passing object instead of separate params
    mockRenderer.drawRect({ x: 10 } as any, undefined, undefined, undefined);

    assert.ok(mockRenderer.hasErrors(), "Should have errors");
    const errors = mockRenderer.getErrors();
    assert.ok(errors.some(e => e.includes("must be number")), "Should complain about type");
  });

  it("should catch invalid color values", () => {
    mockRenderer.reset();
    // Color values must be 0.0-1.0
    mockRenderer.drawRect(0, 0, 100, 100, { color: { r: 255, g: 255, b: 255 } });

    assert.ok(mockRenderer.hasErrors(), "Should have errors");
    const errors = mockRenderer.getErrors();
    assert.ok(errors.some(e => e.includes("color.r must be 0.0-1.0")), "Should catch invalid color");
  });

  it("should validate drawText parameters", () => {
    mockRenderer.reset();
    mockRenderer.drawText("Hello", { x: 10.0, y: 20.0, size: 16.0, color: { r: 1.0, g: 1.0, b: 1.0 } });

    mockRenderer.assertNoErrors();
    mockRenderer.assertCalled("drawText", 1);
  });

  it("should catch NaN values", () => {
    mockRenderer.reset();
    mockRenderer.drawRect(NaN, 0, 100, 100);

    assert.ok(mockRenderer.hasErrors(), "Should catch NaN");
    const errors = mockRenderer.getErrors();
    assert.ok(errors.some(e => e.includes("NaN")), "Should complain about NaN");
  });
});

// Example: Testing a game's rendering code
describe("Game Visual Tests", () => {
  it("should render HUD correctly", () => {
    mockRenderer.reset();
    installMockRenderer();

    // Import game code that uses rendering
    function renderHUD(health: number, gold: number) {
      (globalThis as any).drawText(`HP: ${health}`, {
        x: 10.0,
        y: 10.0,
        size: 16.0,
        color: { r: 1.0, g: 0.0, b: 0.0 }
      });

      (globalThis as any).drawText(`Gold: ${gold}`, {
        x: 10.0,
        y: 30.0,
        size: 16.0,
        color: { r: 1.0, g: 0.84, b: 0.0 }
      });
    }

    renderHUD(100, 50);

    mockRenderer.assertNoErrors();
    mockRenderer.assertCalled("drawText", 2);

    const calls = mockRenderer.getCalls("drawText");
    assert.ok(calls[0].params[0] === "HP: 100", "First text correct");
    assert.ok(calls[1].params[0] === "Gold: 50", "Second text correct");

    restoreRenderer();
  });
});
