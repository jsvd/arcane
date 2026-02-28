/**
 * Simple test to verify arcane import resolves (V8-only)
 */

import { it } from "./testing/harness.ts";

// This test only works in V8 where the import map is configured
const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_submit_sprite_batch === "function";

if (hasRenderOps) {
  // Try importing from arcane (V8 only)
  try {
    // @ts-ignore - runtime-only test
    const arcane = await import("arcane");

    it("arcane module resolves", () => {
      if (!arcane) {
        throw new Error("arcane module is undefined");
      }
      console.log("Arcane exports:", Object.keys(arcane).slice(0, 10));
    });
  } catch (err) {
    it("arcane module import error", () => {
      throw new Error("Failed to import arcane: " + err);
    });
  }
} else {
  // Skip in Node - import map not available
  it("arcane module resolves (skipped in Node)", () => {
    // This test only runs in V8 where the import map is configured
  });
}
