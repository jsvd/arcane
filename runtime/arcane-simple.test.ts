/**
 * Simple test to verify arcane import resolves
 */

import { it } from "./testing/harness.ts";

// Try importing from arcane
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
